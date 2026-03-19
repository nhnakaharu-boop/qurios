'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Profile, SubjectType } from '@/types/database';
import { clsx } from 'clsx';
import {
  Play, Pause, Square, Dumbbell, Coffee, Timer,
  Zap, Star, CheckCircle, ChevronRight, Crown, Volume2
} from 'lucide-react';

// ── CONSTANTS ──────────────────────────────────────────────
const STUDY_SEC     = 25 * 60;   // 25 min
const COOLDOWN_SEC  = 5 * 60;    // 5 min absolute cooldown
const SQUAT_SEC     = 3 * 60;    // 3 min squats
const REST_SEC      = 2 * 60;    // 2 min rest
const NOMINATE_AT   = 30;        // show nominate button 30s before cooldown ends

const SUBJECTS: { value: SubjectType; label: string; icon: string }[] = [
  { value: 'math',      label: '数学',   icon: '∫' },
  { value: 'english',   label: '英語',   icon: '📖' },
  { value: 'chemistry', label: '化学',   icon: '🧪' },
  { value: 'physics',   label: '物理',   icon: '⚡' },
  { value: 'biology',   label: '生物',   icon: '🌿' },
  { value: 'japanese',  label: '国語',   icon: '📝' },
  { value: 'social',    label: '社会',   icon: '🌍' },
  { value: 'info',      label: '情報',   icon: '💻' },
];

type Phase =
  | 'select'          // subject selection
  | 'greeting'        // lesson start greeting + post challenge
  | 'studying'        // 25-min lesson timer
  | 'squat'           // 3-min squat cooldown
  | 'rest'            // 2-min rest cooldown
  | 'nominate'        // 30s before end: show tutor list
  | 'matching'        // matching next tutor
  | 'completed';      // session ended

interface Props {
  profile: Profile | null;
  onlineTutors: Record<string, unknown>[];
}

const MOCK_TUTORS = [
  { id: 'T1', display_name: '田中 数学講師', is_verified_tutor: true,  follower_count: 1240, subject_tags: ['math'], status: 'online' },
  { id: 'T2', display_name: '鈴木 英語講師', is_verified_tutor: false, follower_count: 892,  subject_tags: ['english'], status: 'online' },
  { id: 'T3', display_name: '中村 理科講師', is_verified_tutor: true,  follower_count: 564,  subject_tags: ['chemistry','physics'], status: 'ending_soon' },
];

export default function EndlessStudyClient({ profile, onlineTutors }: Props) {
  const supabase = createClient();

  // ── Session state ──
  const [phase, setPhase]           = useState<Phase>('select');
  const [subject, setSubject]       = useState<SubjectType>('math');
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalStudySec, setTotalStudySec] = useState(0);
  const [currentTutor, setCurrentTutor]   = useState<Record<string, unknown> | null>(null);
  const [matchingAnim, setMatchingAnim]    = useState(false);
  const [greetingText, setGreetingText]    = useState('');
  const [nominated, setNominated]          = useState(false);

  // ── Timer state ──
  const [timer, setTimer]           = useState(STUDY_SEC);
  const [coolTimer, setCoolTimer]   = useState(COOLDOWN_SEC);
  const [squatTimer, setSquatTimer] = useState(SQUAT_SEC);
  const [restTimer, setRestTimer]   = useState(REST_SEC);
  const [squatCount, setSquatCount] = useState(0);
  const [isRunning, setIsRunning]   = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Achievements ──
  const [newAchievement, setNewAchievement] = useState<{icon:string;name:string} | null>(null);

  // formatTime helper
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ── Check achievements after each cycle ──
  const checkAchievements = useCallback(async (cycles: number) => {
    if (!profile?.id) return;
    const toUnlock: string[] = [];
    if (cycles === 1) toUnlock.push('first_endless');
    if (cycles === 3) toUnlock.push('endless_3');
    if (cycles === 10) toUnlock.push('endless_10');
    for (const code of toUnlock) {
      const { data: ach } = await supabase.from('achievements').select('id,name,icon').eq('code', code).single();
      if (ach) {
        await supabase.from('user_achievements').insert({ user_id: profile.id, achievement_id: ach.id }).onConflict('user_id,achievement_id');
        setNewAchievement({ icon: ach.icon, name: ach.name });
        setTimeout(() => setNewAchievement(null), 4000);
      }
    }
  }, [profile?.id, supabase]);

  // ── Start session ──
  async function startSession() {
    setMatchingAnim(true);
    await new Promise(r => setTimeout(r, 1800));
    setMatchingAnim(false);

    // Create session in DB
    const { data: sess } = await supabase.from('endless_sessions').insert({
      student_id: profile!.id, subject, status: 'active', cycle_count: 0, total_study_sec: 0,
    }).select().single();
    if (sess) setSessionId(sess.id);

    const tutor = MOCK_TUTORS[0];
    setCurrentTutor(tutor);
    setCycleCount(1);
    setTimer(STUDY_SEC);
    setPhase('greeting');
    setGreetingText('');
    setIsRunning(false);
  }

  // ── Start lesson timer after greeting ──
  function startLesson() {
    setPhase('studying');
    setIsRunning(true);
  }

  // ── Stop session ──
  async function stopSession() {
    clearInterval(timerRef.current!);
    setIsRunning(false);
    if (sessionId) {
      await supabase.from('endless_sessions').update({ status: 'completed', ended_at: new Date().toISOString(), cycle_count: cycleCount, total_study_sec: totalStudySec }).eq('id', sessionId);
      await supabase.from('profiles').update({ endless_count: supabase.rpc('increment' as never, { row_id: profile!.id }) as never }).eq('id', profile!.id);
    }
    setPhase('completed');
  }

  // ── Main timer tick ──
  useEffect(() => {
    if (!isRunning) { clearInterval(timerRef.current!); return; }
    timerRef.current = setInterval(() => {
      if (phase === 'studying') {
        setTimer(t => {
          setTotalStudySec(s => s + 1);
          if (t <= 1) {
            clearInterval(timerRef.current!);
            // Pay tutor ¥100
            supabase.from('earnings').insert({ tutor_id: currentTutor?.id as string, type: 'endless_lesson', amount_yen: 100, month: new Date().toISOString().slice(0, 7), lesson_id: null, challenge_id: null }).then(() => {});
            setPhase('squat');
            setSquatTimer(SQUAT_SEC);
            setSquatCount(0);
            setCoolTimer(COOLDOWN_SEC);
            return 0;
          }
          return t - 1;
        });
      } else if (phase === 'squat') {
        setSquatTimer(t => {
          if (t <= 1) {
            setPhase('rest');
            setRestTimer(REST_SEC);
            return 0;
          }
          return t - 1;
        });
        setCoolTimer(c => c - 1);
      } else if (phase === 'rest') {
        setRestTimer(t => {
          setCoolTimer(c => {
            if (c <= NOMINATE_AT + 1 && !nominated) setPhase('nominate');
            return c - 1;
          });
          if (t <= 1) { startNextCycle(); return 0; }
          return t - 1;
        });
      } else if (phase === 'nominate') {
        setCoolTimer(c => {
          if (c <= 1) { startNextCycle(); return 0; }
          return c - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isRunning, phase, nominated]);

  // ── Start next cycle ──
  async function startNextCycle(tutorId?: string) {
    setNominated(false);
    setMatchingAnim(true);
    await new Promise(r => setTimeout(r, 1500));
    setMatchingAnim(false);

    const nextTutor = tutorId
      ? MOCK_TUTORS.find(t => t.id === tutorId) ?? MOCK_TUTORS[Math.floor(Math.random() * MOCK_TUTORS.length)]
      : MOCK_TUTORS[Math.floor(Math.random() * MOCK_TUTORS.length)];

    setCurrentTutor(nextTutor);
    const nextCycle = cycleCount + 1;
    setCycleCount(nextCycle);
    setTimer(STUDY_SEC);
    setPhase('greeting');
    setIsRunning(false);
    await checkAchievements(nextCycle - 1);
  }

  async function nominateTutor(tutorId: string) {
    setNominated(true);
    toast.success('講師を指名しました！決済後に授業が始まります。');
    setTimeout(() => startNextCycle(tutorId), 2000);
  }

  // Progress circle
  const studyProgress = timer / STUDY_SEC;
  const coolProgress  = coolTimer / COOLDOWN_SEC;
  const sqProgress    = squatTimer / SQUAT_SEC;
  const C = 2 * Math.PI * 54;

  // ── RENDER PHASES ──────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Achievement toast */}
      {newAchievement && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-yellow-900 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 animate-[slideDown_0.4s_ease]">
          <span className="text-2xl">{newAchievement.icon}</span>
          <div>
            <div className="text-xs font-bold tracking-wide uppercase">🎉 実績解除！</div>
            <div className="font-bold">{newAchievement.name}</div>
          </div>
        </div>
      )}

      {/* ── SELECT PHASE ── */}
      {phase === 'select' && (
        <div className="w-full max-w-[500px] text-white text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-blue-400 text-sm font-semibold tracking-wide uppercase">
            <Zap size={16} /><span>エンドレス25分学習</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">科目を選んで<br />学習を始めよう</h1>
          <p className="text-white/50 text-sm mb-8">25分授業 → 5分クールタイム（運動+休憩）を繰り返します</p>

          <div className="grid grid-cols-4 gap-2.5 mb-8">
            {SUBJECTS.map(s => (
              <button key={s.value} onClick={() => setSubject(s.value)}
                className={clsx('flex flex-col items-center gap-2 py-4 px-2 rounded-[14px] border transition-all cursor-pointer',
                  subject === s.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white')}>
                <span className="text-xl">{s.icon}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: '⏱', label: '25分授業', sub: '講師と1対1' },
              { icon: '💪', label: '3分スクワット', sub: '運動で記憶定着' },
              { icon: '☕', label: '2分休憩', sub: '次の授業の準備' },
            ].map(c => (
              <div key={c.label} className="bg-white/5 border border-white/10 rounded-[12px] p-3 text-center">
                <div className="text-xl mb-1">{c.icon}</div>
                <div className="text-xs font-semibold text-white">{c.label}</div>
                <div className="text-[11px] text-white/40 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          {matchingAnim ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              <div className="text-white/60 text-sm">講師をマッチング中...</div>
            </div>
          ) : (
            <button onClick={startSession}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none rounded-[14px] py-4 text-base font-bold cursor-pointer transition-all flex items-center justify-center gap-2">
              <Play size={20} />エンドレス学習を開始
            </button>
          )}

          <p className="text-white/30 text-xs mt-4">有料生徒・有料講師のみ利用可能 · 1授業ごとに講師へ¥100支払われます</p>
        </div>
      )}

      {/* ── GREETING PHASE ── */}
      {phase === 'greeting' && (
        <div className="w-full max-w-[480px] text-white">
          <div className="text-center mb-6">
            <div className="text-sm text-blue-400 font-semibold mb-1">サイクル {cycleCount}</div>
            <h2 className="text-xl font-bold">授業が始まります！</h2>
          </div>

          {/* Tutor card */}
          <div className="bg-white/5 border border-white/10 rounded-[18px] p-5 mb-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {(currentTutor?.display_name as string)?.[0] ?? '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-white">{currentTutor?.display_name as string}</span>
                {currentTutor?.is_verified_tutor && (
                  <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Crown size={8} />公式</span>
                )}
              </div>
              <div className="text-xs text-white/50">👥 {currentTutor?.follower_count as number}フォロワー</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-400 font-semibold">● オンライン</div>
              <div className="text-xs text-white/40 mt-0.5">¥100/授業</div>
            </div>
          </div>

          {/* Greeting input */}
          <div className="bg-white/5 border border-white/10 rounded-[14px] p-4 mb-5">
            <div className="text-sm font-semibold text-white mb-3">👋 挨拶・課題を投稿しよう</div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
                {profile?.display_name?.[0] ?? '?'}
              </div>
              <textarea
                value={greetingText}
                onChange={e => setGreetingText(e.target.value)}
                placeholder={`例：よろしくお願いします！${SUBJECTS.find(s => s.value === subject)?.label}の○○を教えてください。`}
                rows={3}
                className="flex-1 bg-white/5 border border-white/10 rounded-[10px] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none resize-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div className="text-[11px] text-white/30 text-right">{greetingText.length} / 200文字</div>
          </div>

          <button onClick={startLesson}
            className="w-full bg-green-600 hover:bg-green-500 text-white border-none rounded-[14px] py-3.5 font-bold cursor-pointer transition-all flex items-center justify-center gap-2">
            <Play size={18} />授業を開始（25分）
          </button>

          <button onClick={stopSession}
            className="w-full mt-2 bg-transparent border border-white/10 text-white/40 rounded-[14px] py-3 text-sm cursor-pointer hover:text-white/70 transition-all">
            セッションを終了
          </button>
        </div>
      )}

      {/* ── STUDYING PHASE ── */}
      {phase === 'studying' && (
        <div className="w-full max-w-[420px] text-white text-center">
          <div className="text-sm text-blue-400 font-semibold mb-1">サイクル {cycleCount} · 授業中</div>
          <div className="text-lg font-bold text-white mb-8">{currentTutor?.display_name as string}と授業中</div>

          {/* Big timer circle */}
          <div className="relative w-[140px] h-[140px] mx-auto mb-8">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="70" cy="70" r="54" fill="none" stroke="#3B82F6" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={C}
                strokeDashoffset={C * (1 - studyProgress)}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-[32px] font-bold text-white leading-none">{fmt(timer)}</div>
              <div className="text-xs text-white/40 mt-1">残り</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="bg-white/5 rounded-[12px] p-3">
              <div className="text-xl mb-1">⏱</div>
              <div className="text-xs text-white/40">総学習時間</div>
              <div className="font-mono text-sm font-semibold">{fmt(totalStudySec)}</div>
            </div>
            <div className="bg-white/5 rounded-[12px] p-3">
              <div className="text-xl mb-1">🔄</div>
              <div className="text-xs text-white/40">サイクル</div>
              <div className="font-mono text-sm font-semibold">{cycleCount}回目</div>
            </div>
            <div className="bg-white/5 rounded-[12px] p-3">
              <div className="text-xl mb-1">💰</div>
              <div className="text-xs text-white/40">講師への報酬</div>
              <div className="font-mono text-sm font-semibold">¥{(cycleCount - 1) * 100}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setIsRunning(p => !p)}
              className="flex-1 bg-white/10 border border-white/10 text-white rounded-[12px] py-3 font-medium cursor-pointer hover:bg-white/15 transition-all flex items-center justify-center gap-2">
              {isRunning ? <><Pause size={16} />一時停止</> : <><Play size={16} />再開</>}
            </button>
            <button onClick={stopSession}
              className="flex-1 bg-red-600/30 border border-red-500/30 text-red-400 rounded-[12px] py-3 font-medium cursor-pointer hover:bg-red-600/40 transition-all flex items-center justify-center gap-2">
              <Square size={16} />終了
            </button>
          </div>
        </div>
      )}

      {/* ── SQUAT PHASE ── */}
      {phase === 'squat' && (
        <div className="w-full max-w-[440px] text-white text-center">
          <div className="text-4xl mb-3">💪</div>
          <h2 className="text-2xl font-bold mb-2">運動しよう！</h2>
          <p className="text-white/50 text-sm mb-6">スクワットで血流を上げると記憶の定着率がUPします。3分間だけ！</p>

          {/* Squat timer */}
          <div className="relative w-[140px] h-[140px] mx-auto mb-4">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="70" cy="70" r="54" fill="none" stroke="#F59E0B" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={C}
                strokeDashoffset={C * (1 - sqProgress)}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-[32px] font-bold text-amber-400 leading-none">{fmt(squatTimer)}</div>
              <div className="text-xs text-white/40 mt-1">スクワット</div>
            </div>
          </div>

          {/* Squat counter */}
          <button onClick={() => setSquatCount(c => c + 1)}
            className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 border-none text-white font-bold text-lg cursor-pointer mb-4 active:scale-95 transition-all mx-auto flex items-center justify-center">
            <Dumbbell size={28} />
          </button>
          <div className="text-amber-400 font-mono text-2xl font-bold mb-2">{squatCount} 回</div>
          <div className="text-white/30 text-xs mb-6">タップするたびにカウント！</div>

          {/* Ad placeholder */}
          <div className="bg-white/5 border border-white/10 rounded-[12px] p-4 mb-3">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">広告</div>
            <div className="h-16 bg-white/5 rounded-[8px] flex items-center justify-center text-white/20 text-sm">
              🎯 健康食品・プロテインの広告など
            </div>
          </div>

          <div className="text-white/30 text-xs">
            クールタイム残り {fmt(coolTimer)} · 自動で次のフェーズに進みます
          </div>

          {/* Start squat timer auto */}
          {!isRunning && (
            <button onClick={() => setIsRunning(true)} className="hidden" />
          )}
        </div>
      )}

      {/* ── REST PHASE ── */}
      {phase === 'rest' && (
        <div className="w-full max-w-[440px] text-white text-center">
          <div className="text-4xl mb-3">☕</div>
          <h2 className="text-2xl font-bold mb-2">2分間休憩しよう</h2>
          <p className="text-white/50 text-sm mb-6">水を飲んで、次の授業の準備をしましょう。</p>

          <div className="font-mono text-[56px] font-bold text-teal-400 mb-6">{fmt(restTimer)}</div>

          <div className="bg-white/5 border border-white/10 rounded-[12px] p-4 mb-3">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-2">広告</div>
            <div className="h-16 bg-white/5 rounded-[8px] flex items-center justify-center text-white/20 text-sm">
              📚 教材・参考書の広告など
            </div>
          </div>

          <div className="text-white/30 text-xs">
            クールタイム残り {fmt(coolTimer)}
          </div>
        </div>
      )}

      {/* ── NOMINATE PHASE (last 30s) ── */}
      {phase === 'nominate' && (
        <div className="w-full max-w-[480px] text-white">
          <div className="text-center mb-5">
            <div className="font-mono text-[48px] font-bold text-blue-400 mb-1">{fmt(coolTimer)}</div>
            <div className="text-sm text-white/50">次の授業が始まります。講師を指名しますか？</div>
          </div>

          {/* Available tutors */}
          <div className="space-y-3 mb-5">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold px-1">フォロー中のオンライン講師</div>
            {MOCK_TUTORS.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[14px] p-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                  {t.display_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-white truncate">{t.display_name}</span>
                    {t.is_verified_tutor && (
                      <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0">
                        <Crown size={7} />公式
                      </span>
                    )}
                  </div>
                  <div className={clsx('text-[11px] font-medium', t.status === 'online' ? 'text-green-400' : 'text-amber-400')}>
                    {t.status === 'online' ? '● 待機中' : '⏱ まもなく空き'}
                  </div>
                </div>
                <button onClick={() => nominateTutor(t.id)}
                  className="bg-blue-600 hover:bg-blue-500 text-white border-none rounded-[10px] px-4 py-2 text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap">
                  指名 + チケット
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => startNextCycle()}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white border-none rounded-[12px] py-3 font-semibold cursor-pointer transition-all">
              ランダムマッチング
            </button>
          </div>
          <p className="text-white/20 text-xs text-center mt-3">指名後に決済が完了しない場合、自動でランダムマッチングします</p>
        </div>
      )}

      {/* ── MATCHING ── */}
      {matchingAnim && (
        <div className="fixed inset-0 bg-black/60 z-40 flex flex-col items-center justify-center gap-4 text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-lg font-semibold">講師をマッチング中...</div>
          <div className="text-sm text-white/40">30秒以内に授業が始まります</div>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {phase === 'completed' && (
        <div className="w-full max-w-[440px] text-white text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">お疲れ様でした！</h2>
          <p className="text-white/50 text-sm mb-8">今日のエンドレス学習セッションが完了しました。</p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'サイクル数',  val: `${cycleCount}回`,  icon: '🔄' },
              { label: '総学習時間', val: fmt(totalStudySec), icon: '⏱' },
              { label: '講師への報酬', val: `¥${cycleCount * 100}`, icon: '💰' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-[12px] p-4">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-mono font-bold text-lg text-white">{s.val}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase('select'); setCycleCount(0); setTotalStudySec(0); setTimer(STUDY_SEC); }}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-[12px] py-3 font-semibold cursor-pointer transition-all">
              もう一度
            </button>
            <button onClick={() => window.location.href = '/dashboard'}
              className="flex-1 bg-white/10 border border-white/10 text-white rounded-[12px] py-3 font-medium cursor-pointer hover:bg-white/15 transition-all">
              ダッシュボードへ
            </button>
          </div>
        </div>
      )}

      {/* Phase auto-start effect */}
      {(phase === 'squat' || phase === 'rest' || phase === 'nominate') && !isRunning && (
        <button className="hidden" onClick={() => setIsRunning(true)} ref={el => { if (el) el.click(); }} />
      )}
    </div>
  );
}
