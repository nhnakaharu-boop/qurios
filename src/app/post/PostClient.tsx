'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { Profile, SubjectType } from '@/types/database';
import { getChallengeRate as getRate } from '@/types/database';
import { Lock, CheckCircle, Loader2, BookOpen, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import SymbolBar from '@/components/ui/SymbolBar';
import RatingModal from '@/components/ui/RatingModal';

const SUBJECTS: { value: SubjectType; label: string; icon: string }[] = [
  { value: 'math',      label: '数学',  icon: '∫' },
  { value: 'english',   label: '英語',  icon: '📖' },
  { value: 'chemistry', label: '化学',  icon: '🧪' },
  { value: 'physics',   label: '物理',  icon: '⚡' },
  { value: 'biology',   label: '生物',  icon: '🌿' },
  { value: 'japanese',  label: '国語',  icon: '📝' },
  { value: 'social',    label: '社会',  icon: '🌍' },
  { value: 'info',      label: '情報',  icon: '💻' },
];

const GRADES = ['中学1年','中学2年','中学3年','高校1年','高校2年','高校3年','大学生','社会人','その他'];

const RATE_TABLE = [
  { minMin: 0,    maxMin: 149,   rate: 0,    label: '〜149分' },
  { minMin: 150,  maxMin: 1499,  rate: 0.05, label: '150〜1499分' },
  { minMin: 1500, maxMin: 4499,  rate: 0.1,  label: '1500〜4499分' },
  { minMin: 4500, maxMin: 7999,  rate: 0.2,  label: '4500〜7999分' },
  { minMin: 8000, maxMin: Infinity, rate: 0.4, label: '8000分〜' },
];

const lessonSchema = z.object({
  subject:    z.string().min(1),
  grade:      z.string().min(1),
  difficulty: z.enum(['basic','standard','advanced']),
  content:    z.string().min(10,'10文字以上入力してください').max(500),
  memo:       z.string().max(200).optional(),
  tags:       z.array(z.string()).optional(),
});

const challengeSchema = z.object({
  subject:     z.string().min(1),
  difficulty:  z.enum(['basic','standard','advanced']),
  question:    z.string().min(5,'5文字以上').max(500),
  answer:      z.string().min(1,'解答を入力').max(300),
  explanation: z.string().max(1000).optional(),
  youtube_url: z.string().url().optional().or(z.literal('')),
});

type LessonData    = z.infer<typeof lessonSchema>;
type ChallengeData = z.infer<typeof challengeSchema>;

type MatchStatus = 'idle' | 'waiting' | 'matched' | 'cancelled';

interface Props { profile: Profile | null; }

export default function PostClient({ profile }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<'lesson'|'challenge'>(searchParams.get('tab') === 'challenge' ? 'challenge' : 'lesson');
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('idle');
  const [waitSec, setWaitSec] = useState(0);
  const [matchedTutor, setMatchedTutor] = useState<Partial<Profile> | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [contentValue, setContentValue] = useState('');
  const [questionValue, setQuestionValue] = useState('');
  const [answerValue, setAnswerValue] = useState('');
  const waitRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  const answerRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  const monthlyMin = profile?.monthly_lesson_minutes ?? 0;
  const canPostChallenge = monthlyMin >= 150;
  const currentRate = getRate(monthlyMin);
  const isPaidStudent = ['student_paid','student_paid_plus'].includes(profile?.plan ?? '');
  const isPaidTutor = profile?.plan === 'tutor_paid';
  const isStudent = profile?.role === 'student';

  const lessonForm = useForm<LessonData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { subject: 'math', grade: '高校2年', difficulty: 'standard' },
  });

  const challengeForm = useForm<ChallengeData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: { subject: 'math', difficulty: 'standard' },
  });

  // Insert symbol at cursor
  function insertSymbol(target: 'content' | 'question' | 'answer', sym: string) {
    const el = target === 'content' ? contentRef.current : target === 'question' ? questionRef.current : answerRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const val = el.value;
    const newVal = val.slice(0, pos) + sym + val.slice(pos);
    if (target === 'content') { setContentValue(newVal); lessonForm.setValue('content', newVal); }
    else if (target === 'question') { setQuestionValue(newVal); challengeForm.setValue('question', newVal); }
    else { setAnswerValue(newVal); challengeForm.setValue('answer', newVal); }
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = pos + sym.length; });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.length >= 5 || tags.includes(t)) return;
    const newTags = [...tags, t];
    setTags(newTags);
    lessonForm.setValue('tags', newTags);
    setTagInput('');
  }

  async function startLesson(data: LessonData) {
    if (!profile) return;
    try {
      const { data: lesson, error } = await supabase.from('lessons').insert({
        student_id: profile.id,
        subject: data.subject as SubjectType,
        grade: data.grade,
        difficulty: data.difficulty as 'basic'|'standard'|'advanced',
        content: data.content,
        memo: data.memo,
        status: 'waiting',
        lesson_type: '5min',
      }).select().single();
      if (error) throw error;
      setLessonId(lesson.id);
      setMatchStatus('waiting');
      setWaitSec(0);
      waitRef.current = setInterval(() => setWaitSec(s => s + 1), 1000);

      // Realtime match
      const sub = supabase.channel(`lesson_${lesson.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lessons', filter: `id=eq.${lesson.id}` },
          async (payload) => {
            if (payload.new.status === 'matched' && payload.new.tutor_id) {
              clearInterval(waitRef.current!);
              const { data: tutor } = await supabase.from('profiles').select('id,display_name,avg_rating,is_verified_tutor').eq('id', payload.new.tutor_id).single();
              setMatchedTutor(tutor);
              setMatchStatus('matched');
            }
          })
        .subscribe();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '投稿に失敗しました'); }
  }

  async function cancelWait() {
    clearInterval(waitRef.current!);
    if (lessonId) await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lessonId);
    setMatchStatus('idle'); setWaitSec(0); setLessonId(null);
  }

  async function submitChallenge(data: ChallengeData) {
    if (!profile) return;
    if (!canPostChallenge) { toast.error('月150分以上授業をしてから投稿できます'); return; }
    if (!isPaidTutor && profile.role !== 'tutor') { toast.error('自作課題の投稿は講師のみ可能です'); return; }
    if (data.youtube_url && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(data.youtube_url)) {
      toast.error('YouTubeのURLのみ貼ることができます'); return;
    }
    try {
      await supabase.from('challenges').insert({
        author_id: profile.id,
        subject: data.subject as SubjectType,
        difficulty: data.difficulty as 'basic'|'standard'|'advanced',
        question: data.question,
        answer: data.answer,
        explanation: data.explanation,
        youtube_url: data.youtube_url || null,
      });
      toast.success('課題を投稿しました！');
      challengeForm.reset();
      setQuestionValue(''); setAnswerValue('');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '投稿に失敗しました'); }
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="p-7 max-w-[780px]">
      <h1 className="text-[20px] font-bold tracking-tight mb-1">課題を投稿</h1>
      <p className="text-sm text-[--text2] mb-6">困っている問題を投稿して全国の講師とマッチングしよう</p>

      {/* Tabs */}
      <div className="flex border border-[--border] rounded-[12px] overflow-hidden mb-7 bg-[--surface]">
        {([['lesson','⏱ 5分授業'], ['challenge','⭐ 自作課題（講師のみ）']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex-1 py-3 text-sm font-medium transition-all border-none cursor-pointer',
              tab === key ? 'bg-[--blue] text-white' : 'bg-transparent text-[--text2] hover:bg-[--surface2]')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LESSON TAB ── */}
      {tab === 'lesson' && (
        <div>
          {/* Priority matching notice for paid students */}
          {isPaidStudent && (
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-[12px] p-4 mb-5">
              <span className="text-lg">⚡</span>
              <div>
                <div className="text-sm font-semibold text-blue-800">有料会員優先マッチング</div>
                <div className="text-xs text-blue-700 mt-0.5">有料講師と優先的にマッチングされます。平均待機時間が短くなります。</div>
              </div>
            </div>
          )}

          {/* Ad notice */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-[12px] p-4 mb-5">
            <span className="text-lg">📢</span>
            <div>
              <div className="text-sm font-semibold text-amber-800">講師待機中は広告が表示されます</div>
              <div className="text-xs text-amber-700 mt-0.5">全プラン共通で広告が流れます（生徒有料プラン+は広告なし）。</div>
            </div>
          </div>

          {/* WAITING */}
          {matchStatus === 'waiting' && (
            <div className="card p-8 text-center mb-5">
              <div className="w-20 h-20 rounded-full bg-[--blue-lt] border-2 border-[--blue-mid] flex items-center justify-center text-3xl mx-auto mb-5 animate-pulse">🔍</div>
              <div className="text-lg font-bold mb-2">講師を探しています...</div>
              <div className="text-sm text-[--text2] mb-5">AIが最適な講師を自動マッチング中です</div>
              <div className="font-mono text-[36px] font-bold text-[--blue] mb-6">{fmt(waitSec)}</div>
              {!isPaidStudent && (
                <div className="bg-[--surface2] border border-[--border] rounded-[12px] p-5 mb-5 text-center">
                  <div className="text-[10px] font-bold tracking-widest text-[--text3] uppercase mb-2">広告</div>
                  <div className="h-20 bg-gradient-to-r from-blue-50 to-green-50 rounded-[8px] flex items-center justify-center text-sm text-[--text2] border border-[--border]">
                    🎯 参考書・教材の広告
                  </div>
                </div>
              )}
              <button onClick={cancelWait} className="border border-[--border2] text-[--text2] bg-transparent rounded-[8px] px-6 py-2.5 text-sm cursor-pointer hover:bg-[--surface2] transition-colors">キャンセル</button>
            </div>
          )}

          {/* MATCHED */}
          {matchStatus === 'matched' && matchedTutor && (
            <div className="flex items-center gap-4 bg-green-50 border border-green-300 rounded-[12px] p-5 mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {matchedTutor.display_name?.[0] ?? '?'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-700">✓ {matchedTutor.display_name}がマッチングしました！</div>
                <div className="text-xs text-[--text2] mt-0.5">
                  {matchedTutor.avg_rating ? `⭐ ${matchedTutor.avg_rating.toFixed(1)}` : ''}
                  {matchedTutor.is_verified_tutor ? ' · 👑公式' : ''}
                </div>
              </div>
              <button onClick={() => { router.push(`/lesson/${lessonId}`); }}
                className="bg-green-600 text-white border-none rounded-[9px] px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-green-700 transition-colors">
                授業を開始 →
              </button>
            </div>
          )}

          {/* FORM */}
          {matchStatus === 'idle' && (
            <form onSubmit={lessonForm.handleSubmit(startLesson)} className="card p-6">
              <div className="text-sm font-semibold mb-5 pb-4 border-b border-[--border]">📝 課題の内容</div>

              {/* Subject */}
              <div className="mb-5">
                <label className="block text-xs font-medium mb-2.5">科目を選択</label>
                <div className="grid grid-cols-4 gap-2">
                  {SUBJECTS.map(s => (
                    <button key={s.value} type="button" onClick={() => lessonForm.setValue('subject', s.value)}
                      className={clsx('flex flex-col items-center gap-1.5 py-3 rounded-[10px] border text-xs font-medium cursor-pointer transition-all',
                        lessonForm.watch('subject') === s.value ? 'bg-[--blue] border-[--blue] text-white' : 'bg-transparent border-[--border] text-[--text2] hover:border-[--blue]')}>
                      <span className="text-lg">{s.icon}</span>{s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade + Difficulty */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium mb-1.5">学年</label>
                  <select {...lessonForm.register('grade')} className="input">
                    {GRADES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">難易度</label>
                  <div className="flex gap-2">
                    {(['basic','standard','advanced'] as const).map(d => (
                      <button key={d} type="button" onClick={() => lessonForm.setValue('difficulty', d)}
                        className={clsx('flex-1 py-2 rounded-[9px] border text-xs font-medium cursor-pointer transition-all',
                          lessonForm.watch('difficulty') === d ? 'bg-[--blue-lt] border-[--blue] text-[--blue]' : 'bg-transparent border-[--border] text-[--text2]')}>
                        {d === 'basic' ? '基礎' : d === 'standard' ? '標準' : '応用'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content with symbol bar */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5">課題の内容</label>
                <SymbolBar onInsert={s => insertSymbol('content', s)} className="mb-2" />
                <textarea
                  {...lessonForm.register('content')}
                  ref={el => { (lessonForm.register('content') as Record<string, unknown>).ref?.(el); contentRef.current = el; }}
                  value={contentValue}
                  onChange={e => { setContentValue(e.target.value); lessonForm.setValue('content', e.target.value); }}
                  rows={5} maxLength={500}
                  className="input resize-none leading-relaxed"
                  placeholder="例：微積分 ∫(x²+3x)dx の解き方がわかりません。不定積分の計算手順を教えてください。"
                />
                <div className="flex justify-between mt-1">
                  {lessonForm.formState.errors.content && <p className="text-xs text-red-500">{lessonForm.formState.errors.content.message}</p>}
                  <span className="text-[11px] text-[--text3] ml-auto">{contentValue.length} / 500</span>
                </div>
              </div>

              {/* Memo */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5">講師へのメモ（任意）</label>
                <input {...lessonForm.register('memo')} className="input" placeholder="例：教科書P.142の例題3に関連" />
              </div>

              {/* Tags */}
              <div className="mb-5">
                <label className="block text-xs font-medium mb-1.5">タグ（任意・最大5個）</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-[--blue-lt] text-[--blue] border border-[--blue-mid] rounded-full px-2.5 py-1">
                      {t}<button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} className="border-none bg-transparent cursor-pointer text-[--blue]"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="input flex-1 text-sm" placeholder="例：微分積分、2次方程式..." />
                  <button type="button" onClick={addTag} className="border border-[--border2] text-[--text2] bg-transparent rounded-[9px] px-3 text-sm cursor-pointer hover:bg-[--surface2]">追加</button>
                </div>
              </div>

              {/* Reference book shortcut */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-[--surface2] border border-[--border] rounded-[10px]">
                <BookOpen size={16} className="text-[--text3] shrink-0" />
                <div className="flex-1 text-xs text-[--text2]">市販の参考書の問題を解いていますか？</div>
                <button type="button" className="text-xs text-[--blue] border border-[--blue-mid] bg-[--blue-lt] rounded-[7px] px-3 py-1.5 cursor-pointer hover:bg-blue-100 transition-colors whitespace-nowrap">
                  参考書を選ぶ
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button type="submit" className="bg-[--blue] text-white border-none rounded-[10px] px-7 py-3 font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                  投稿してマッチング開始
                </button>
                <span className="text-xs text-[--text3]">平均待機時間：約30秒</span>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── CHALLENGE TAB ── */}
      {tab === 'challenge' && (
        <div>
          {/* Eligibility check */}
          {!canPostChallenge && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-[12px] p-4 mb-5">
              <Lock size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-700 mb-1">月150分以上の授業が必要です</div>
                <div className="text-xs text-red-600 leading-relaxed">今月: {monthlyMin}分 / 150分</div>
                <div className="mt-2 h-1.5 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((monthlyMin/150)*100,100)}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Rate table */}
          <div className="card p-5 mb-5">
            <div className="text-sm font-semibold mb-3">💰 自作課題の報酬単価</div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[--border]">
                <th className="text-left py-2 text-xs text-[--text3] font-medium">月授業時間</th>
                <th className="text-left py-2 text-xs text-[--text3] font-medium">単価/解答</th>
                <th className="text-left py-2 text-xs text-[--text3] font-medium">状態</th>
              </tr></thead>
              <tbody>
                {RATE_TABLE.map((t, i) => {
                  const isCurrent = monthlyMin >= t.minMin && monthlyMin <= t.maxMin;
                  return (
                    <tr key={i} className={clsx('border-b border-[--border] last:border-none', isCurrent && 'bg-[--blue-lt]')}>
                      <td className={clsx('py-2.5 font-medium text-xs', isCurrent && 'text-[--blue]')}>{t.label}{isCurrent && <span className="ml-2 text-[9px] bg-[--blue] text-white px-1.5 py-0.5 rounded-full">現在</span>}</td>
                      <td className={clsx('py-2.5 font-mono font-semibold text-xs', t.rate === 0 ? 'text-[--text3]' : 'text-green-600')}>
                        {t.rate === 0 ? '¥0（対象外）' : `¥${t.rate}`}
                      </td>
                      <td className="py-2.5">
                        {t.rate > 0 ? <CheckCircle size={13} className="text-green-600" /> : <Lock size={13} className="text-[--text3]" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Challenge form */}
          <form onSubmit={challengeForm.handleSubmit(submitChallenge)}
            className={clsx('card p-6', !canPostChallenge && 'opacity-50 pointer-events-none')}>
            <div className="text-sm font-semibold mb-5 pb-4 border-b border-[--border]">✏️ 自作課題を作成</div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-2">科目</label>
              <div className="grid grid-cols-4 gap-2">
                {SUBJECTS.map(s => (
                  <button key={s.value} type="button" onClick={() => challengeForm.setValue('subject', s.value)}
                    className={clsx('flex flex-col items-center gap-1 py-2.5 rounded-[9px] border text-xs font-medium cursor-pointer transition-all',
                      challengeForm.watch('subject') === s.value ? 'bg-[--blue] border-[--blue] text-white' : 'bg-transparent border-[--border] text-[--text2] hover:border-[--blue]')}>
                    <span className="text-base">{s.icon}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-2">問題文</label>
              <SymbolBar onInsert={s => insertSymbol('question', s)} className="mb-2" />
              <textarea
                {...challengeForm.register('question')}
                value={questionValue}
                onChange={e => { setQuestionValue(e.target.value); challengeForm.setValue('question', e.target.value); }}
                ref={el => { questionRef.current = el; }}
                rows={3} maxLength={500}
                className="input resize-none"
                placeholder="例：次の微分を求めよ。y = x³ − 4x + 2"
              />
              {challengeForm.formState.errors.question && <p className="text-xs text-red-500 mt-1">{challengeForm.formState.errors.question.message}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-2">正解</label>
              <SymbolBar onInsert={s => insertSymbol('answer', s)} className="mb-2" />
              <input
                {...challengeForm.register('answer')}
                value={answerValue}
                onChange={e => { setAnswerValue(e.target.value); challengeForm.setValue('answer', e.target.value); }}
                ref={el => { answerRef.current = el; }}
                className="input"
                placeholder="例：y' = 3x² − 4"
              />
              {challengeForm.formState.errors.answer && <p className="text-xs text-red-500 mt-1">{challengeForm.formState.errors.answer.message}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-2">解説（任意）</label>
              <textarea {...challengeForm.register('explanation')} rows={3} maxLength={1000} className="input resize-none" placeholder="解き方のヒントや解説を書くと解答率UP！" />
            </div>

            {/* YouTube link for paid tutors */}
            {isPaidTutor && (
              <div className="mb-5">
                <label className="block text-xs font-medium mb-2 flex items-center gap-1.5">
                  <span className="text-red-500 text-base">▶</span>解説YouTubeリンク（任意・有料講師のみ）
                </label>
                <input {...challengeForm.register('youtube_url')} className="input" placeholder="https://youtube.com/watch?v=..." />
                <p className="text-[11px] text-[--text3] mt-1">YouTubeリンクのみ貼れます。個人SNSリンクは不可。</p>
              </div>
            )}

            <button type="submit" disabled={!canPostChallenge}
              className="bg-[--blue] text-white border-none rounded-[10px] px-7 py-3 font-semibold cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity">
              課題を投稿する
            </button>
          </form>
        </div>
      )}

      {/* Rating modal after matched lesson ends */}
      {showRating && matchedTutor && lessonId && (
        <RatingModal
          lessonId={lessonId}
          tutor={matchedTutor}
          onClose={() => setShowRating(false)}
          onSubmit={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}
