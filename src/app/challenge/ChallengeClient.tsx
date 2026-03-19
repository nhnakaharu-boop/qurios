'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Challenge, Profile } from '@/types/database';
import ReportButton from '@/components/ui/ReportButton';
import { ArrowLeft, Heart, MessageCircle, GraduationCap, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

const SYMBOLS = ['∫','√','Σ','π','²','³','≤','≥','≠','∞','±','×','÷','→','∈'];
const SUBJECT_LABELS: Record<string, string> = { math:'数学', english:'英語', chemistry:'化学', physics:'物理', biology:'生物', japanese:'国語', social:'社会', info:'情報' };

interface Props {
  profile: Profile | null;
  initialChallenges: Challenge[];
}

export default function ChallengeClient({ profile, initialChallenges }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>('all');
  const [showComments, setShowComments] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqNote, setReqNote] = useState('');
  const [animDir, setAnimDir] = useState<'up'|'down'|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  const q = challenges[current];

  // Load existing likes/follows
  useEffect(() => {
    if (!profile || !challenges.length) return;
    const ids = challenges.map(c => c.id);
    supabase.from('challenge_likes').select('challenge_id').eq('user_id', profile.id).in('challenge_id', ids)
      .then(({ data }) => {
        if (data) setLiked(Object.fromEntries(data.map(d => [d.challenge_id, true])));
      });
    const authorIds = [...new Set(challenges.map(c => c.author_id))];
    supabase.from('follows').select('following_id').eq('follower_id', profile.id).in('following_id', authorIds)
      .then(({ data }) => {
        if (data) setFollowed(Object.fromEntries(data.map(d => [d.following_id, true])));
      });
  }, [profile, challenges]);

  function go(dir: 1|-1) {
    const next = current + dir;
    if (next < 0 || next >= challenges.length) return;
    setAnimDir(dir > 0 ? 'up' : 'down');
    setTimeout(() => { setCurrent(next); setAnimDir(null); }, 350);
  }

  async function submitAnswer(cId: string) {
    const ans = answers[cId]?.trim();
    if (!ans) return;
    if (!profile) { toast.error('ログインしてください'); return; }
    try {
      await supabase.from('challenge_answers').upsert({ challenge_id: cId, user_id: profile.id, answer: ans });
      setSubmitted(p => ({ ...p, [cId]: true }));
      await supabase.from('profiles').update({ total_answers: (profile.total_answers ?? 0) + 1 }).eq('id', profile.id);
      setTimeout(() => go(1), 1200);
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleLike(cId: string) {
    if (!profile) return;
    const isLiked = liked[cId];
    setLiked(p => ({ ...p, [cId]: !isLiked }));
    if (isLiked) {
      await supabase.from('challenge_likes').delete().eq('challenge_id', cId).eq('user_id', profile.id);
    } else {
      await supabase.from('challenge_likes').insert({ challenge_id: cId, user_id: profile.id });
    }
    setChallenges(p => p.map(c => c.id === cId ? { ...c, like_count: c.like_count + (isLiked ? -1 : 1) } : c));
  }

  async function toggleFollow(authorId: string) {
    if (!profile) return;
    const isFollowing = followed[authorId];
    setFollowed(p => ({ ...p, [authorId]: !isFollowing }));
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', authorId);
      toast.success('フォローを解除しました');
    } else {
      await supabase.from('follows').insert({ follower_id: profile.id, following_id: authorId });
      toast.success('フォローしました');
    }
  }

  async function sendLessonRequest() {
    if (!profile || !q) return;
    try {
      await supabase.from('lesson_requests').insert({
        challenge_id: q.id, student_id: profile.id, tutor_id: q.author_id, message: reqNote,
      });
      setRequested(p => ({ ...p, [q.id]: true }));
      setShowReqModal(false);
      toast.success('解説依頼を送りました！');
    } catch (e: any) { toast.error(e.message); }
  }

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = startYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 50) go(dy > 0 ? 1 : -1);
  };
  // Wheel
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > 30) go(e.deltaY > 0 ? 1 : -1);
  };

  const filteredChallenges = filter === 'all' ? challenges : challenges.filter(c => c.subject === filter);
  const displayQ = filteredChallenges[current] ?? challenges[current];

  if (!displayQ) return <div className="p-10 text-center text-[--text2]">課題がまだありません</div>;

  const author = (displayQ as any).author as Profile | null;
  const isTutor = author?.role === 'tutor' || author?.role === 'admin';

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-56px)] overflow-hidden bg-[--bg]"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>

      {/* LEFT MINI NAV */}
      <div className="w-16 bg-[--surface] border-r border-[--border] flex flex-col items-center py-3 gap-2 flex-shrink-0">
        <button onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-[10px] border border-[--border] flex items-center justify-center text-[--text2] hover:bg-[--surface2] hover:text-[--text] transition-colors border-solid bg-transparent cursor-pointer relative group"
          title="ダッシュボードへ">
          <ArrowLeft size={18} />
          <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-[--surface2] border border-[--border2] text-[--text2] text-[11px] px-2 py-1 rounded-[7px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            ダッシュボード
          </span>
        </button>
        <div className="w-8 h-px bg-[--border]" />
        {/* Filter pills */}
        {['all','math','english','chemistry','physics'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setCurrent(0); }}
            className={clsx('w-10 h-10 rounded-[10px] text-[10px] font-bold border cursor-pointer transition-all',
              filter === f ? 'bg-[--blue] text-white border-[--blue]' : 'bg-transparent text-[--text3] border-[--border] hover:bg-[--surface2]')}>
            {f === 'all' ? 'ALL' : SUBJECT_LABELS[f]?.[0]}
          </button>
        ))}
        {/* Nav arrows */}
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={() => go(-1)} disabled={current === 0}
            className="w-10 h-10 rounded-[10px] border border-[--border] flex items-center justify-center text-[--text3] hover:bg-[--surface2] disabled:opacity-30 transition-all bg-transparent cursor-pointer">
            <ChevronUp size={18} />
          </button>
          <button onClick={() => go(1)} disabled={current >= challenges.length - 1}
            className="w-10 h-10 rounded-[10px] border border-[--border] flex items-center justify-center text-[--text3] hover:bg-[--surface2] disabled:opacity-30 transition-all bg-transparent cursor-pointer">
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* MAIN FEED */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Card */}
        <div className={clsx('w-full max-w-[420px] h-full flex flex-col transition-transform duration-350',
          animDir === 'up' ? '-translate-y-full opacity-0' : animDir === 'down' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100')}>

          {/* AI badge */}
          <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-[--surface]/80 backdrop-blur-sm border border-[--border2] rounded-full px-3 py-1 text-[11px] text-[--text2] z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[--blue] animate-pulse" />
            AI個別フィード
          </div>

          <div className="flex-1 bg-[--surface] border border-[--border] mx-3 my-2.5 rounded-[22px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[--border]">
              <span className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}>
                {SUBJECT_LABELS[displayQ.subject] ?? displayQ.subject}
              </span>
              <span className="text-[11px] bg-[--surface2] border border-[--border] rounded-full px-2.5 py-0.5 text-[--text3]">
                {displayQ.difficulty === 'basic' ? '基礎' : displayQ.difficulty === 'advanced' ? '応用' : '標準'}
              </span>
              <span className="ml-auto text-[11px] text-[--text3]">{current + 1} / {challenges.length}</span>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {/* Author row */}
              <div className="flex items-center gap-2.5 justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--blue), #818CF8)' }}>
                    {author?.display_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">{author?.display_name ?? '講師'}</div>
                    <div className="text-[11px] text-[--text3]">
                      {isTutor ? `講師 · フォロワー ${author?.follower_count ?? 0}人` : ''}
                    </div>
                  </div>
                </div>
                {isTutor && (
                  <button onClick={() => toggleFollow(displayQ.author_id)}
                    className={clsx('text-xs font-semibold px-3.5 py-1.5 rounded-full border cursor-pointer transition-all',
                      followed[displayQ.author_id]
                        ? 'bg-transparent text-[--text3] border-[--border2] hover:bg-red-50 hover:text-red-500 hover:border-red-300'
                        : 'bg-[--blue] text-white border-[--blue] hover:bg-blue-700')}>
                    {followed[displayQ.author_id] ? 'フォロー中' : 'フォロー'}
                  </button>
                )}
              </div>

              <div className="text-[15px] font-medium leading-relaxed">{displayQ.question}</div>

              {/* Request lesson */}
              {isTutor && (
                <button onClick={() => setShowReqModal(true)} disabled={requested[displayQ.id]}
                  className={clsx('flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-[13px] font-semibold border cursor-pointer transition-all w-full',
                    requested[displayQ.id]
                      ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                      : 'bg-[--teal-lt] border border-teal-200 text-teal-700 hover:bg-teal-100')}>
                  <GraduationCap size={16} />
                  {requested[displayQ.id] ? '✓ 解説依頼済み' : 'この問題を投稿者に解説してもらう'}
                </button>
              )}

              {/* Answer section */}
              <div className="mt-auto">
                <div className="text-xs text-[--text2] font-medium mb-2">あなたの解答</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {SYMBOLS.map(s => (
                    <button key={s} onClick={() => {
                      const id = displayQ.id;
                      setAnswers(p => ({ ...p, [id]: (p[id] ?? '') + s }));
                    }} className="bg-[--surface2] border border-[--border2] text-[--text2] rounded-[7px] px-2 py-1 text-xs font-mono cursor-pointer hover:bg-[--blue-lt] hover:border-[--blue] hover:text-[--blue] transition-all">
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={answers[displayQ.id] ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, [displayQ.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && submitAnswer(displayQ.id)}
                    placeholder="解答を入力..."
                    className="flex-1 bg-[--surface2] border-[1.5px] border-[--border2] rounded-[10px] px-3 py-2.5 text-sm text-[--text] outline-none focus:border-[--blue] transition-colors" />
                  <button onClick={() => submitAnswer(displayQ.id)}
                    className="bg-[--blue] text-white border-none rounded-[10px] px-4 py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                    解答
                  </button>
                </div>
                {submitted[displayQ.id] && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-[10px]">
                    <div className="text-[11px] font-bold text-green-700 mb-1 tracking-wide">✓ 正解</div>
                    <div className="font-mono text-sm text-green-700">{displayQ.answer}</div>
                    {displayQ.explanation && <div className="text-xs text-[--text2] mt-1.5 leading-relaxed">{displayQ.explanation}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SIDE ACTIONS */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          {[
            { icon: Heart, label: String(displayQ.like_count + (liked[displayQ.id] ? 1 : 0)), active: liked[displayQ.id], onClick: () => toggleLike(displayQ.id), activeClass: 'bg-red-50 border-red-200' },
            { icon: MessageCircle, label: String(displayQ.comment_count), onClick: () => setShowComments(true), active: false, activeClass: '' },
          ].map(({ icon: Icon, label, active, onClick, activeClass }) => (
            <button key={label + Icon.name} onClick={onClick}
              className={clsx('flex flex-col items-center gap-1 cursor-pointer border-none bg-transparent text-[--text2] transition-transform hover:scale-110 active:scale-95')}>
              <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center text-[18px] bg-[--surface] border border-[--border] transition-all', active && activeClass)}>
                <Icon size={18} className={active ? 'text-red-500 fill-red-500' : ''} />
              </div>
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
          <button onClick={() => { if (navigator.share) navigator.share({ title: 'Qurios Challenge', text: displayQ.question }); }}
            className="flex flex-col items-center gap-1 cursor-pointer border-none bg-transparent text-[--text2] hover:scale-110 transition-transform">
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[--surface] border border-[--border]"><Share2 size={18} /></div>
            <span className="text-[11px] font-medium">共有</span>
          </button>
        </div>

        {/* Swipe hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[--text3] text-[11px] pointer-events-none animate-pulse">
          <ChevronUp size={14} />
          <span>スワイプで次へ</span>
        </div>
      </div>

      {/* COMMENT DRAWER */}
      {showComments && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-end justify-center" onClick={e => e.target === e.currentTarget && setShowComments(false)}>
          <div className="w-full max-w-[420px] bg-[--surface] rounded-t-[22px] border-t border-[--border2] max-h-[65%] flex flex-col">
            <div className="w-9 h-1 bg-[--border2] rounded mx-auto mt-3 mb-1" />
            <div className="text-sm font-semibold px-5 py-3 border-b border-[--border]">コメント {displayQ.comment_count}件</div>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-[--text2]">コメントを読み込み中...</div>
            <div className="flex gap-2 p-3 border-t border-[--border]">
              <input placeholder="コメントを追加..." className="flex-1 bg-[--surface2] border border-[--border2] rounded-full px-4 py-2 text-sm text-[--text] outline-none focus:border-[--blue]" />
              <button className="w-9 h-9 bg-[--blue] rounded-full flex items-center justify-center border-none cursor-pointer">
                <Share2 size={14} className="text-white rotate-45" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST LESSON MODAL */}
      {showReqModal && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-end justify-center" onClick={e => e.target === e.currentTarget && setShowReqModal(false)}>
          <div className="w-full max-w-[420px] bg-[--surface] rounded-t-[22px] border-t border-[--border2] p-6">
            <div className="w-9 h-1 bg-[--border2] rounded mx-auto mb-5" />
            <div className="text-[16px] font-bold mb-2">🎓 投稿者に解説を依頼</div>
            <div className="text-sm text-[--text2] leading-relaxed mb-4">
              この問題の作成者に1対1の授業を依頼します。
            </div>
            <div className="flex items-center gap-3 bg-[--surface2] border border-[--border] rounded-[12px] p-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {author?.display_name?.[0] ?? '?'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{author?.display_name}</div>
                <div className="text-xs text-[--text3]">講師 · フォロワー {author?.follower_count ?? 0}人</div>
              </div>
              <button onClick={() => toggleFollow(displayQ.author_id)}
                className={clsx('text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer',
                  followed[displayQ.author_id] ? 'text-[--text3] border-[--border2] bg-transparent' : 'bg-teal-600 text-white border-teal-600')}>
                {followed[displayQ.author_id] ? 'フォロー中' : 'フォロー'}
              </button>
            </div>
            <textarea value={reqNote} onChange={e => setReqNote(e.target.value)}
              placeholder="講師へのメッセージ（任意）" rows={3}
              className="w-full bg-[--surface2] border border-[--border2] rounded-[10px] p-3 text-sm text-[--text] outline-none resize-none mb-4 focus:border-[--blue]" />
            <button onClick={sendLessonRequest}
              className="w-full bg-teal-600 text-white border-none rounded-[11px] py-3.5 text-sm font-semibold cursor-pointer hover:bg-teal-700 transition-colors mb-2">
              授業を依頼する（チケット1枚 or ¥98）
            </button>
            <button onClick={() => setShowReqModal(false)}
              className="w-full bg-transparent text-[--text3] border-none py-2.5 text-sm cursor-pointer">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
