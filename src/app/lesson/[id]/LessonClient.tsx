'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Profile, Lesson } from '@/types/database';
import { Mic, MicOff, Camera, CameraOff, Monitor, PhoneOff, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import RatingModal from '@/components/ui/RatingModal';
import ReportButton from '@/components/ui/ReportButton';
import SymbolBar from '@/components/ui/SymbolBar';

const TOTAL_5  = 5  * 60;
const TOTAL_25 = 25 * 60;

interface Props {
  profile: Profile | null;
  lesson: Lesson & { student: Partial<Profile>; tutor: Partial<Profile> | null };
  userId: string;
}

export default function LessonClient({ profile, lesson, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isStudent  = lesson.student_id === userId;
  const lessonType = lesson.lesson_type ?? '5min';
  const TOTAL      = lessonType === '25min' ? TOTAL_25 : TOTAL_5;

  const [remaining, setRemaining] = useState(TOTAL);
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(true);
  const [showEndModal, setShowEndModal]     = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showRating, setShowRating]         = useState(false);
  const [photoSent, setPhotoSent]           = useState(false);
  const [activeTab, setActiveTab]           = useState<'question'|'photo'>('question');
  const [note, setNote]                     = useState('');
  const [ended, setEnded]                   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const circumference = 2 * Math.PI * 30;

  useEffect(() => {
    if (lesson.status !== 'active') return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current!); setShowEndModal(true); return 0; }
        if (r === 60) toast('⏱ 残り1分です', { icon: '⚠️' });
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [lesson.status]);

  async function endLesson(resolved: boolean) {
    clearInterval(timerRef.current!);
    await supabase.from('lessons').update({
      status: 'completed',
      is_resolved: resolved,
      ended_at: new Date().toISOString(),
      duration_sec: TOTAL - remaining,
    }).eq('id', lesson.id);

    // Update lesson minutes for tutor
    if (lesson.tutor_id) {
      const durationMin = Math.ceil((TOTAL - remaining) / 60);
      const { data: tp } = await supabase.from('profiles').select('monthly_lessons, total_lessons, monthly_lesson_minutes').eq('id', lesson.tutor_id).single();
      if (tp) {
        await supabase.from('profiles').update({
          monthly_lessons: (tp.monthly_lessons ?? 0) + 1,
          total_lessons: (tp.total_lessons ?? 0) + 1,
          monthly_lesson_minutes: (tp.monthly_lesson_minutes ?? 0) + durationMin,
        }).eq('id', lesson.tutor_id);
      }
    }
    setEnded(true);
    setShowEndModal(false);
    setShowRating(true);
  }

  async function useTicketExtend() {
    if ((profile?.ticket_count ?? 0) <= 0) { toast.error('チケットがありません'); return; }
    await supabase.from('profiles').update({ ticket_count: (profile?.ticket_count ?? 1) - 1 }).eq('id', userId);
    await fetch('/api/lesson/extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lesson.id, useTicket: true }) });
    setRemaining(r => r + TOTAL_5);
    setShowExtendModal(false);
    toast.success('5分延長しました（チケット1枚使用）');
  }

  const progress = remaining / TOTAL;
  const strokeOffset = circumference * (1 - progress);
  const timerColor = remaining < 30 ? '#F87171' : remaining < 60 ? '#F59E0B' : '#3B82F6';
  const partner = isStudent ? lesson.tutor : lesson.student;
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  function insertNoteSymbol(sym: string) {
    setNote(p => p + sym);
  }

  return (
    <div className="grid h-screen bg-[#080C10] text-white" style={{ gridTemplateColumns: '1fr 320px', gridTemplateRows: '1fr auto' }}>

      {/* VIDEO AREA */}
      <div className="relative bg-black overflow-hidden flex items-center justify-center flex-col gap-4"
        style={{ gridColumn: 1, gridRow: 1, background: 'radial-gradient(ellipse at center, #1a2540 0%, #080C10 70%)' }}>
        <div className="w-36 h-36 rounded-full flex items-center justify-center text-5xl font-bold text-white border-4 border-blue-500/30"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #818CF8)', boxShadow: '0 0 40px rgba(59,130,246,0.2)' }}>
          {partner?.display_name?.[0] ?? '?'}
        </div>
        <div className="text-base font-medium text-white/70">{partner?.display_name ?? '接続中...'}</div>
        <div className="flex items-center gap-2 text-sm text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {lessonType === '25min' ? '25分授業中' : '5分授業中'}
        </div>

        {/* Self cam */}
        <div className="absolute bottom-20 right-4 w-[110px] h-[80px] rounded-[12px] bg-[#1C2A3A] border-2 border-white/20 flex items-center justify-center">
          {camOn ? <span className="text-white/30 text-xs">カメラ接続中</span> : <CameraOff size={20} className="text-white/30" />}
        </div>

        {/* Timer ring */}
        <div className="absolute top-4 right-4">
          <div className="relative w-[72px] h-[72px]">
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle cx="36" cy="36" r="30" fill="none" stroke={timerColor} strokeWidth="3"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-sm font-medium text-white">{fmt(remaining)}</span>
              <span className="text-[9px] text-white/40">残り</span>
            </div>
          </div>
        </div>

        {/* Top info bar */}
        <div className="absolute top-0 left-0 right-[80px] flex items-center gap-3 px-4 py-3"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
          <div className="flex items-center gap-2 bg-black/50 border border-white/20 rounded-full px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />{lessonType === '25min' ? '25分授業中' : '5分授業中'}
          </div>
          <div className="bg-black/50 border border-white/20 rounded-[8px] px-3 py-1 text-xs text-white/60 truncate max-w-[300px]">
            {lesson.content}
          </div>
          {/* Report button for the partner */}
          {partner?.id && (
            <div className="ml-auto">
              <ReportButton reportedUserId={partner.id} reportedUserName={partner.display_name} lessonId={lesson.id} />
            </div>
          )}
        </div>
      </div>

      {/* SIDE PANEL */}
      <div className="flex flex-col bg-[#0F1520] border-l border-white/10" style={{ gridColumn: 2, gridRow: '1/3' }}>
        <div className="flex items-center gap-1 px-4 py-3 border-b border-white/10">
          {(['question','photo'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={clsx('px-3 py-1.5 rounded-[7px] text-xs font-medium cursor-pointer border-none transition-all',
                activeTab === t ? 'bg-[#161E2C] text-white' : 'bg-transparent text-white/40 hover:text-white/70')}>
              {t === 'question' ? '課題' : '写真・メモ'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'question' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">{lesson.subject}</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/7 text-white/40">{lesson.difficulty}</span>
              </div>
              <div className="text-sm font-medium leading-relaxed text-white">{lesson.content}</div>
              {lesson.memo && <div className="text-xs text-white/40 bg-white/5 rounded-[8px] p-3 leading-relaxed">{lesson.memo}</div>}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-[10px] p-3">
                <div className="text-[11px] font-semibold text-blue-400 mb-2">✦ 授業メモ</div>
                <SymbolBar onInsert={insertNoteSymbol} className="mb-2" />
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-[8px] px-2.5 py-2 text-xs text-white/70 outline-none resize-none focus:border-blue-500/40"
                  placeholder="授業内容をメモしておこう..." />
              </div>
            </div>
          )}

          {activeTab === 'photo' && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[10px] p-3 text-xs text-amber-300 leading-relaxed">
                📷 送信した写真は授業終了後に<strong>即時自動削除</strong>されます。
              </div>
              {!photoSent ? (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-[12px] h-24 cursor-pointer hover:border-white/40 transition-colors">
                  <Upload size={20} className="text-white/40" />
                  <span className="text-sm text-white/40">写真をアップロード</span>
                  <input type="file" accept="image/*" className="hidden" onChange={() => { setPhotoSent(true); toast.success('写真を送信しました'); }} />
                </label>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-[10px] p-3 text-xs text-green-400">✓ 送信済み · 授業終了後に自動削除されます</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTROL BAR */}
      <div className="bg-[#0F1520] border-t border-white/10 flex items-center gap-2.5 px-5 py-3" style={{ gridColumn: 1, gridRow: 2 }}>
        {[
          { icon: micOn ? Mic : MicOff, label: 'マイク', active: micOn, onClick: () => setMicOn(p => !p) },
          { icon: camOn ? Camera : CameraOff, label: 'カメラ', active: camOn, onClick: () => setCamOn(p => !p) },
          { icon: Monitor, label: '画面共有', active: false, onClick: () => toast('画面共有は準備中です') },
        ].map(({ icon: Icon, label, active, onClick }) => (
          <button key={label} onClick={onClick}
            className={clsx('flex flex-col items-center gap-1 px-3 py-2 rounded-[10px] border cursor-pointer transition-all min-w-[52px]',
              active ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')}>
            <Icon size={17} /><span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {isStudent && !ended && lessonType === '5min' && (
          <button onClick={() => setShowExtendModal(true)}
            className="text-blue-400 border border-blue-500/40 bg-transparent rounded-[10px] px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-blue-500/10 transition-colors">
            +5分延長
          </button>
        )}
        {!ended && (
          <button onClick={() => setShowEndModal(true)}
            className="bg-red-600 text-white border-none rounded-[10px] px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-red-500 transition-colors flex items-center gap-2">
            <PhoneOff size={16} />解決しました ✓
          </button>
        )}
      </div>

      {/* END MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-[#0F1520] border border-white/20 rounded-[20px] p-8 w-[360px] text-center">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-lg font-bold mb-2">授業を終了しますか？</div>
            <div className="text-sm text-white/50 leading-relaxed mb-6">
              終了後に講師への評価画面が表示されます。
            </div>
            <div className="space-y-2">
              <button onClick={() => endLesson(true)} className="w-full bg-green-600 text-white border-none rounded-[10px] py-3 text-sm font-semibold cursor-pointer hover:bg-green-500 transition-colors">
                終了して評価する
              </button>
              <button onClick={() => setShowEndModal(false)} className="w-full bg-transparent text-white/40 border border-white/10 rounded-[10px] py-3 text-sm cursor-pointer hover:bg-white/5">
                戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND MODAL */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-[#0F1520] border border-white/20 rounded-[20px] p-8 w-[360px] text-center">
            <div className="text-4xl mb-3">⏱</div>
            <div className="text-lg font-bold mb-2">5分延長しますか？</div>
            <div className="text-sm text-white/50 mb-1">チケット残数：<span className="text-amber-400 font-bold">{profile?.ticket_count ?? 0}枚</span></div>
            <div className="text-2xl font-bold text-amber-400 my-4">¥98</div>
            <div className="space-y-2">
              <button onClick={useTicketExtend} disabled={(profile?.ticket_count ?? 0) <= 0}
                className="w-full bg-green-600 text-white border-none rounded-[10px] py-3 text-sm font-semibold cursor-pointer hover:bg-green-500 disabled:opacity-40 transition-colors">
                チケットを使用（残{profile?.ticket_count ?? 0}枚）
              </button>
              <a href="https://buy.stripe.com/test_3cIcN65GWf6Lbzlawh7bW00" target="_blank" rel="noopener noreferrer"
                className="block w-full bg-red-500/20 text-red-400 border border-red-500/30 rounded-[10px] py-3 text-sm cursor-pointer hover:bg-red-500/30 transition-colors no-underline text-center">
                ¥98 で延長（Stripe決済）
              </a>
              <button onClick={() => setShowExtendModal(false)} className="w-full bg-transparent text-white/40 border-none py-2.5 text-sm cursor-pointer">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRating && lesson.tutor && (
        <RatingModal
          lessonId={lesson.id}
          tutor={lesson.tutor}
          onClose={() => { setShowRating(false); router.push('/dashboard'); }}
          onSubmit={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}
