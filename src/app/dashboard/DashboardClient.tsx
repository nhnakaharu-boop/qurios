'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Profile, Lesson, Challenge } from '@/types/database';
import { BookOpen, Star, Trophy, Clock, TrendingUp, AlertCircle, Zap, Brain, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

const SUBJECT_LABELS: Record<string, string> = {
  math: '数学', english: '英語', chemistry: '化学',
  physics: '物理', biology: '生物', japanese: '国語',
  social: '社会', info: '情報', other: 'その他',
};
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: '解決済み', color: 'text-green-700', bg: 'bg-green-50' },
  active:    { label: '授業中',   color: 'text-blue-700',  bg: 'bg-blue-50'  },
  waiting:   { label: '待機中',   color: 'text-amber-700', bg: 'bg-amber-50' },
  matched:   { label: 'マッチ済み', color: 'text-blue-700', bg: 'bg-blue-50' },
  cancelled: { label: 'キャンセル', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const RADAR_SUBJECTS = ['数学', '英語', '化学', '物理', '国語', '情報'];
const RADAR_SCORES   = [68, 75, 42, 55, 81, 65];

interface Props {
  profile: Profile | null;
  recentLessons: Lesson[];
  recommendedChallenges: Challenge[];
  ranking: { rank_pos: number; score: number } | null;
}

export default function DashboardClient({ profile, recentLessons, recommendedChallenges, ranking }: Props) {
  const [cooltimeRemain, setCooltimeRemain] = useState<number | null>(null);
  const isGuest = profile?.username === 'guest_user';

  useEffect(() => {
    const lastLesson = recentLessons.find(l => l.status === 'completed' && l.ended_at);
    if (!lastLesson?.ended_at) return;
    const elapsed = (Date.now() - new Date(lastLesson.ended_at).getTime()) / 1000;
    const remain = 600 - elapsed;
    if (remain > 0 && profile?.plan !== 'student_premium') {
      setCooltimeRemain(Math.floor(remain));
      const int = setInterval(() => setCooltimeRemain(p => (p !== null && p > 0) ? p - 1 : null), 1000);
      return () => clearInterval(int);
    }
  }, [recentLessons, profile?.plan]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';
  const firstName = profile?.display_name?.split(' ')[0] ?? 'さん';

  const stats = [
    { label: '今月の授業回数', value: profile?.monthly_lessons ?? 0, unit: '回', color: 'text-blue-600', icon: BookOpen, trend: '+8' },
    { label: 'Challenge 解答', value: profile?.total_answers ?? 0,   unit: '問', color: 'text-teal-600',  icon: Star,     trend: '+47' },
    { label: 'サービス偏差値', value: profile?.deviation_score?.toFixed(1) ?? '--', unit: '', color: 'text-amber-600', icon: TrendingUp, trend: '+2.1' },
    { label: '総学習時間',     value: ((profile?.total_study_min ?? 0) / 60).toFixed(1), unit: 'h', color: 'text-purple-600', icon: Clock, trend: '-0.5h' },
  ];

  // SVG radar chart
  const radarPath = (() => {
    const cx = 90, cy = 90, r = 70;
    const pts = RADAR_SUBJECTS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / RADAR_SUBJECTS.length - Math.PI / 2;
      const v = (RADAR_SCORES[i] / 100) * r;
      return `${cx + v * Math.cos(angle)},${cy + v * Math.sin(angle)}`;
    });
    return `M${pts.join('L')}Z`;
  })();

  const gridPaths = [0.25, 0.5, 0.75, 1].map(scale => {
    const cx = 90, cy = 90, r = 70;
    const pts = RADAR_SUBJECTS.map((_, i) => {
      const angle = (Math.PI * 2 * i) / RADAR_SUBJECTS.length - Math.PI / 2;
      const v = scale * r;
      return `${cx + v * Math.cos(angle)},${cy + v * Math.sin(angle)}`;
    });
    return `M${pts.join('L')}Z`;
  });

  return (
    <div className="p-6 max-w-[1100px]">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {greeting}、{firstName}さん 👋
        </h1>
        <p className="text-sm text-[--text2] mt-1">
          {isGuest
            ? '🔓 ゲストモードでご利用中です。登録すると全機能が使えます。'
            : `AIが${recommendedChallenges.length}件のおすすめ課題を用意しています。`}
        </p>
      </div>

      {/* Guest banner */}
      {isGuest && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-[14px] p-4 mb-5">
          <div className="w-10 h-10 bg-amber-400 rounded-[10px] flex items-center justify-center text-white text-lg flex-shrink-0">🎁</div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold text-amber-800">ゲストモード中 — 機能が制限されています</div>
            <div className="text-xs text-amber-700 mt-0.5">無料登録すると、課題投稿・講師マッチング・収益機能が使えます。</div>
          </div>
          <Link href="/auth/register" className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-[8px] no-underline hover:bg-amber-600 whitespace-nowrap">
            今すぐ登録
          </Link>
        </div>
      )}

      {/* AI Banner */}
      {!isGuest && (
        <div className="flex items-center gap-4 bg-[--blue-lt] border border-[--blue-mid] rounded-[14px] p-4 mb-5">
          <div className="w-10 h-10 bg-[--blue] rounded-[10px] flex items-center justify-center text-white text-lg flex-shrink-0">
            <Zap size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-[--blue]">AIからの学習提案</div>
            <div className="text-[12.5px] text-[--text2] mt-0.5">
              {profile?.subject_tags?.[0]
                ? `${SUBJECT_LABELS[profile.subject_tags[0]] ?? '各科目'}の正答率を改善中。Challengeで集中練習がおすすめです。`
                : '今日も学習を始めましょう。まずは課題を投稿してみてください！'}
            </div>
          </div>
          <Link href="/challenge" className="bg-[--blue] text-white text-xs font-semibold px-3.5 py-2 rounded-[7px] no-underline hover:opacity-90 whitespace-nowrap">
            Challenge を開く
          </Link>
        </div>
      )}

      {/* Cooltime */}
      {cooltimeRemain !== null && cooltimeRemain > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-4 mb-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Brain size={20} className="text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-800">クールタイム中 — 記憶が定着しています</span>
          </div>
          <div className="font-mono text-[36px] font-medium text-amber-600 text-center py-2">
            {Math.floor(cooltimeRemain / 60)}:{String(cooltimeRemain % 60).padStart(2, '0')}
          </div>
          <p className="text-xs text-amber-700 leading-relaxed mb-4 text-center max-w-md mx-auto">
            授業直後の10分間は前の内容を長期記憶へ移行させる最重要な時間です。新しい情報を入れると順向抑制により記憶が消えます。
          </p>
          <button className="w-full border border-amber-400 bg-transparent text-amber-600 rounded-[8px] py-2.5 text-sm font-medium cursor-pointer hover:bg-amber-100 transition-colors">
            30秒広告を見てスキップ
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {stats.map(s => {
          const Icon = s.icon;
          const trendUp = s.trend.startsWith('+');
          return (
            <div key={s.label} className="card p-4 hover:border-[--border2] transition-colors">
              <div className="flex items-center gap-1.5 text-xs text-[--text2] font-medium mb-2">
                <Icon size={13} />{s.label}
              </div>
              <div className={clsx('font-mono text-[24px] font-semibold tracking-tight leading-none mb-1', s.color)}>
                {s.value}<span className="text-[14px] font-normal ml-0.5">{s.unit}</span>
              </div>
              <div className={clsx('text-[11px] font-medium', trendUp ? 'text-green-600' : 'text-red-500')}>
                {s.trend} 先月比
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_290px] gap-3.5">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: '⚡', label: '課題を投稿', sub: '平均45秒でマッチング', href: '/post', color: 'bg-blue-50 border-blue-200' },
              { icon: '⭐', label: 'Challenge', sub: 'AI厳選の問題を解く', href: '/challenge', color: 'bg-amber-50 border-amber-200' },
              { icon: '📅', label: 'スタディプラン', sub: 'AIが計画を生成', href: '/study-plan', color: 'bg-purple-50 border-purple-200' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className={clsx('flex flex-col gap-2 p-3.5 rounded-[12px] border no-underline hover:opacity-80 transition-opacity', a.color)}>
                <span className="text-xl">{a.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-[--text]">{a.label}</div>
                  <div className="text-[11px] text-[--text2]">{a.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent lessons */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--border]">
              <span className="text-sm font-semibold">最近の授業</span>
              <Link href="/lesson" className="text-xs text-[--blue] no-underline font-medium">すべて見る</Link>
            </div>
            {recentLessons.length === 0 ? (
              <div className="px-5 py-8 text-center text-[--text3] text-sm">
                まだ授業がありません。
                <Link href="/post" className="text-[--blue] no-underline ml-1">課題を投稿</Link>
                してみましょう！
              </div>
            ) : (
              recentLessons.map(lesson => {
                const st = STATUS_MAP[lesson.status] ?? STATUS_MAP.completed;
                return (
                  <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{lesson.content}</div>
                      <div className="text-xs text-[--text3] mt-0.5">
                        {(lesson as Record<string, unknown> & { tutor?: { display_name?: string } })?.tutor?.display_name ?? '講師未定'} ·
                        {SUBJECT_LABELS[lesson.subject] ?? lesson.subject} ·
                        {lesson.ended_at ? new Date(lesson.ended_at).toLocaleDateString('ja') : '進行中'}
                      </div>
                    </div>
                    <span className={clsx('text-[11px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap', st.color, st.bg)}>
                      {st.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Recommended challenges */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--border]">
              <span className="text-sm font-semibold">おすすめ Challenge</span>
              <Link href="/challenge" className="text-xs text-[--blue] no-underline font-medium">開く →</Link>
            </div>
            {recommendedChallenges.length === 0 ? (
              <div className="px-5 py-6 text-center text-[--text3] text-sm">Challengeを読み込んでいます...</div>
            ) : recommendedChallenges.map(c => (
              <Link key={c.id} href="/challenge"
                className="flex items-center gap-3 px-5 py-3 border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors no-underline text-[--text]">
                <div className="w-10 h-10 rounded-[10px] bg-[--blue-lt] flex items-center justify-center text-lg flex-shrink-0">
                  {c.subject === 'math' ? '∫' : c.subject === 'english' ? '📖' : '🧪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{c.question}</div>
                  <div className="text-xs text-[--text3] mt-0.5">
                    {SUBJECT_LABELS[c.subject]} · ♥ {c.like_count} · 📝 {c.answer_count}回解答
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 whitespace-nowrap">苦手</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5">
          {/* Radar chart */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--border]">
              <span className="text-sm font-semibold">学習レーダー</span>
              <Link href="/profile" className="text-xs text-[--blue] no-underline">詳細</Link>
            </div>
            <div className="p-4 flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180">
                {gridPaths.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="var(--border)" strokeWidth="1" />
                ))}
                {RADAR_SUBJECTS.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / RADAR_SUBJECTS.length - Math.PI / 2;
                  return <line key={i} x1="90" y1="90" x2={90 + 70 * Math.cos(angle)} y2={90 + 70 * Math.sin(angle)} stroke="var(--border)" strokeWidth="1" />;
                })}
                <path d={radarPath} fill="rgba(37,99,235,0.12)" stroke="var(--blue)" strokeWidth="1.5" />
                {RADAR_SUBJECTS.map((label, i) => {
                  const angle = (Math.PI * 2 * i) / RADAR_SUBJECTS.length - Math.PI / 2;
                  const x = 90 + 84 * Math.cos(angle);
                  const y = 90 + 84 * Math.sin(angle);
                  return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--text2)">{label}</text>;
                })}
              </svg>
            </div>
          </div>

          {/* Ranking */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--border]">
              <span className="text-sm font-semibold">週間ランキング</span>
              <Link href="/ranking" className="text-xs text-[--blue] no-underline">全体を見る</Link>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 bg-[--blue-lt] border border-[--blue-mid] rounded-[10px] p-3">
                <div className="font-mono text-3xl font-bold text-[--blue]">
                  #{ranking?.rank_pos ?? '--'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[--blue]">あなたの今週の順位</div>
                  <div className="text-xs text-[--text2] mt-0.5">{ranking?.score ?? 0}pt 獲得</div>
                </div>
              </div>
            </div>
          </div>

          {/* Study plan shortcut */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--border]">
              <span className="text-sm font-semibold">今日のタスク</span>
              <Link href="/study-plan" className="text-xs text-[--blue] no-underline">詳細</Link>
            </div>
            <div className="p-4 space-y-2">
              {[
                { done: true,  text: '英語の練習問題 10問', time: '15分' },
                { done: false, text: '数学 微積分を復習', time: '20分' },
                { done: false, text: 'Challengeで5問解答', time: '10分' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    t.done ? 'bg-green-500 border-green-500' : 'border-[--border2]')}>
                    {t.done && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span className={clsx('text-xs flex-1', t.done ? 'line-through text-[--text3]' : 'text-[--text2]')}>{t.text}</span>
                  <span className="text-[11px] text-[--text3]">{t.time}</span>
                </div>
              ))}
              <Link href="/study-plan" className="block text-center text-xs text-[--blue] no-underline mt-2 pt-2 border-t border-[--border] hover:underline">
                <Calendar size={12} className="inline mr-1" />全タスクを表示
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

