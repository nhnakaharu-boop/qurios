'use client';
import { useState } from 'react';
import type { Profile, Achievement, UserAchievement } from '@/types/database';
import { clsx } from 'clsx';
import { Flame, Trophy, Star, Zap } from 'lucide-react';

const RARITY_CONFIG = {
  common:    { label: 'コモン',    bg: 'bg-gray-100',   text: 'text-gray-600', ring: 'ring-gray-300'   },
  rare:      { label: 'レア',      bg: 'bg-blue-50',    text: 'text-blue-600', ring: 'ring-blue-300'   },
  epic:      { label: 'エピック',  bg: 'bg-purple-50',  text: 'text-purple-600', ring: 'ring-purple-300' },
  legendary: { label: 'レジェンド', bg: 'bg-amber-50',  text: 'text-amber-600', ring: 'ring-amber-400'  },
};

const MOCK_ALL: Achievement[] = [
  { id:'a1', code:'first_lesson',  name:'初授業',         description:'最初の授業を受けた',           icon:'📚', category:'milestone', rarity:'common',    points:10  },
  { id:'a2', code:'first_endless', name:'はじめての25分', description:'25分エンドレス学習を完了した', icon:'🔥', category:'endless',   rarity:'common',    points:20  },
  { id:'a3', code:'endless_3',     name:'3サイクル達成',  description:'3サイクル連続でエンドレス学習', icon:'⚡', category:'endless',   rarity:'rare',      points:50  },
  { id:'a4', code:'endless_10',    name:'10サイクル達成', description:'10サイクル連続でエンドレス学習',icon:'🌟', category:'endless',   rarity:'epic',      points:200 },
  { id:'a5', code:'streak_7',      name:'7日連続',        description:'7日間連続して学習した',         icon:'🔥', category:'streak',    rarity:'rare',      points:100 },
  { id:'a6', code:'streak_30',     name:'30日連続',       description:'30日間連続して学習した',        icon:'💎', category:'streak',    rarity:'legendary', points:500 },
  { id:'a7', code:'challenge_100', name:'Challenge100問', description:'Challengeを100問解答した',      icon:'🎯', category:'study',     rarity:'rare',      points:100 },
  { id:'a8', code:'lesson_50',     name:'50授業達成',     description:'授業を50回受けた',              icon:'🎓', category:'milestone', rarity:'epic',      points:200 },
  { id:'a9', code:'top_ranker',    name:'TOP10ランカー',  description:'週間ランキングTOP10入り',       icon:'🏆', category:'milestone', rarity:'epic',      points:150 },
  { id:'a10',code:'follower_10',   name:'フォロワー10人', description:'10人にフォローされた',          icon:'👥', category:'social',    rarity:'common',    points:30  },
];

const MOCK_EARNED = new Set(['a1', 'a2', 'a5']);

interface Props {
  profile: Profile | null;
  allAchievements: Achievement[];
  userAchievements: UserAchievement[];
  streak: Record<string, unknown> | null;
}

export default function AchievementsClient({ profile, allAchievements, userAchievements, streak }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const achievements = allAchievements.length > 0 ? allAchievements : MOCK_ALL;
  const earnedIds = userAchievements.length > 0
    ? new Set(userAchievements.map(u => u.achievement_id))
    : MOCK_EARNED;

  const categories = [
    { key: 'all',       label: '全て',     icon: Star },
    { key: 'endless',   label: 'エンドレス', icon: Zap },
    { key: 'streak',    label: 'ストリーク', icon: Flame },
    { key: 'milestone', label: '実績',      icon: Trophy },
    { key: 'study',     label: '学習',      icon: Star },
    { key: 'social',    label: 'ソーシャル', icon: Star },
  ];

  const filtered = filter === 'all' ? achievements : achievements.filter(a => a.category === filter);
  const totalPoints = achievements.filter(a => earnedIds.has(a.id)).reduce((s, a) => s + a.points, 0);
  const currentStreak = (streak?.current_streak as number) ?? 7;

  return (
    <div className="p-7 max-w-[900px]">
      <h1 className="text-[20px] font-bold tracking-tight mb-1">実績・バッジ</h1>
      <p className="text-sm text-[--text2] mb-6">学習を続けて実績を解除しよう。エンドレス学習で特別バッジが手に入ります。</p>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { icon: '🏆', label: '取得実績',     val: `${earnedIds.size}/${achievements.length}` },
          { icon: '⭐', label: '総ポイント',   val: `${totalPoints}pt` },
          { icon: '🔥', label: '連続学習',     val: `${currentStreak}日` },
          { icon: '🌟', label: 'レジェンド',   val: `${achievements.filter(a => a.rarity === 'legendary' && earnedIds.has(a.id)).length}個` },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="font-mono text-[18px] font-bold text-[--text]">{s.val}</div>
            <div className="text-xs text-[--text3] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak visual */}
      <div className="card p-5 mb-6 flex items-center gap-5">
        <div className="text-5xl">🔥</div>
        <div className="flex-1">
          <div className="text-sm font-semibold mb-1">{currentStreak}日連続学習中！</div>
          <div className="flex gap-1 mb-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={clsx('flex-1 h-2 rounded-full', i < currentStreak % 7 || currentStreak >= 7 ? 'bg-amber-400' : 'bg-[--surface2]')} />
            ))}
          </div>
          <div className="text-xs text-[--text3]">
            次の実績まで：7日連続で「7日連続」バッジ解除 → 30日で「30日連続」バッジ解除
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-amber-500">{currentStreak}</div>
          <div className="text-xs text-[--text3]">最長 {(streak?.longest_streak as number) ?? currentStreak}日</div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={clsx('flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all',
              filter === c.key ? 'bg-[--blue] border-[--blue] text-white' : 'bg-[--surface] border-[--border] text-[--text2] hover:border-[--border2]')}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-5 gap-3">
        {filtered.map(a => {
          const earned = earnedIds.has(a.id);
          const r = RARITY_CONFIG[a.rarity];
          return (
            <div key={a.id}
              className={clsx('flex flex-col items-center gap-2 p-4 rounded-[14px] border transition-all cursor-default',
                earned
                  ? clsx(r.bg, 'ring-2', r.ring, 'border-transparent')
                  : 'border-[--border] bg-[--surface] opacity-40 grayscale')}>
              <div className="text-3xl">{a.icon}</div>
              <div className="text-xs font-semibold text-center leading-tight">{a.name}</div>
              <div className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', r.bg, r.text)}>{r.label}</div>
              <div className="text-[11px] text-[--text3] font-mono">{a.points}pt</div>
              {earned && <div className="text-[10px] text-green-600 font-semibold">✓ 取得済み</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
