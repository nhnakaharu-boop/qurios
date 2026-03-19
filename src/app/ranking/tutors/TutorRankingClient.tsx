'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Profile } from '@/types/database';
import { Crown, Star, Zap, Trophy, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

type RankTab = 'daily' | 'monthly' | 'total' | 'rating';

const MOCK_TUTORS = [
  { id: 'T1', display_name: '田中 数学講師', is_verified_tutor: true,  follower_count: 1240, monthly_lessons: 312, total_lessons: 4820, rating: 4.9, subject_tags: ['math'], plan: 'tutor_premium' },
  { id: 'T2', display_name: '鈴木 英語講師', is_verified_tutor: false, follower_count: 892,  monthly_lessons: 287, total_lessons: 3940, rating: 4.8, subject_tags: ['english'], plan: 'tutor_premium' },
  { id: 'T3', display_name: '中村 理科講師', is_verified_tutor: true,  follower_count: 564,  monthly_lessons: 251, total_lessons: 3210, rating: 4.7, subject_tags: ['chemistry', 'physics'], plan: 'tutor_premium' },
  { id: 'T4', display_name: '佐藤 物理講師', is_verified_tutor: true,  follower_count: 2108, monthly_lessons: 198, total_lessons: 5880, rating: 4.9, subject_tags: ['physics'], plan: 'tutor_premium' },
  { id: 'T5', display_name: '山本 国語講師', is_verified_tutor: false, follower_count: 445,  monthly_lessons: 156, total_lessons: 2140, rating: 4.6, subject_tags: ['japanese'], plan: 'tutor_free' },
];

interface Props { tutors: Partial<Profile>[]; followedIds: Set<string>; myProfile: Profile | null; }

export default function TutorRankingClient({ tutors, followedIds: initFollowed, myProfile }: Props) {
  const [tab, setTab] = useState<RankTab>('monthly');
  const [followedIds, setFollowedIds] = useState<Set<string>>(initFollowed);
  const [selected, setSelected] = useState<(typeof MOCK_TUTORS)[0] | null>(null);
  const supabase = createClient();

  const data = tutors.length > 0
    ? tutors.map((t, i) => ({ ...t, rank: i + 1, rating: 4.5 + Math.random() * 0.4 }))
    : MOCK_TUTORS.map((t, i) => ({ ...t, rank: i + 1 }));

  async function toggleFollow(tutorId: string) {
    if (!myProfile) return;
    const isFollowing = followedIds.has(tutorId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', tutorId);
      setFollowedIds(p => { const n = new Set(p); n.delete(tutorId); return n; });
      toast('フォローを解除しました');
    } else {
      await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: tutorId });
      setFollowedIds(p => new Set([...p, tutorId]));
      toast.success('フォローしました！');
    }
  }

  const TABS: { key: RankTab; label: string; icon: React.ElementType }[] = [
    { key: 'daily',   label: '今日',  icon: Zap   },
    { key: 'monthly', label: '月間',  icon: Trophy },
    { key: 'total',   label: '累計',  icon: Star   },
    { key: 'rating',  label: '満足度', icon: Star  },
  ];

  return (
    <div className="p-7 max-w-[900px]">
      <h1 className="text-[20px] font-bold mb-1 tracking-tight">講師ランキング</h1>
      <p className="text-sm text-[--text2] mb-6">授業回数・満足度で講師をランキング。フォローして次の授業で指名できます。</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all',
              tab === t.key ? 'bg-[--blue] border-[--blue] text-white' : 'bg-[--surface] border-[--border] text-[--text2] hover:border-[--border2]')}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Main list */}
        <div className="card overflow-hidden">
          {data.map((t, i) => {
            const isFollowing = followedIds.has(t.id!);
            const isPremium = t.plan === 'tutor_premium' || (t as Record<string, unknown>).is_verified_tutor;
            const isOnline = t.last_seen_at && (Date.now() - new Date(t.last_seen_at as string).getTime()) < 5 * 60 * 1000;
            const metric = tab === 'rating'
              ? `⭐ ${(t as Record<string, unknown>).rating}`
              : tab === 'monthly' ? `${t.monthly_lessons}回/月`
              : tab === 'total'   ? `${t.total_lessons}回`
              : `${Math.floor((t.monthly_lessons ?? 0) / 30)}回/日`;

            return (
              <div key={t.id}
                className="flex items-center gap-3.5 px-5 py-4 border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors cursor-pointer"
                onClick={() => setSelected(MOCK_TUTORS[i] ?? MOCK_TUTORS[0])}>
                {/* Rank */}
                <div className={clsx('w-8 text-center font-mono font-bold text-lg shrink-0',
                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-700' : 'text-[--text3]')}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(t.display_name ?? '?')[0]}
                  </div>
                  {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium truncate">{t.display_name}</span>
                    {isPremium && (
                      <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                        <Crown size={7} />公式
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[--text3]">
                    👥 {t.follower_count?.toLocaleString()} · {metric}
                  </div>
                </div>

                {/* Follow btn */}
                <button onClick={e => { e.stopPropagation(); toggleFollow(t.id!); }}
                  className={clsx('text-xs font-semibold px-3.5 py-1.5 rounded-full border cursor-pointer transition-all shrink-0',
                    isFollowing
                      ? 'bg-transparent text-[--text3] border-[--border2] hover:bg-red-50 hover:text-red-500 hover:border-red-300'
                      : 'bg-[--teal-lt] text-teal-700 border-teal-200 hover:bg-teal-100')}>
                  {isFollowing ? 'フォロー中' : 'フォロー'}
                </button>
                <ChevronRight size={14} className="text-[--text3] shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Tutor detail card */}
        <div>
          {selected ? (
            <div className="card p-5 sticky top-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                  {selected.display_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold">{selected.display_name}</span>
                    {selected.is_verified_tutor && (
                      <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Crown size={7} />公式
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[--text3]">⭐ {selected.rating.toFixed(1)} · 👥 {selected.follower_count.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {[
                  { label: '今月授業', val: `${selected.monthly_lessons}回` },
                  { label: '累計授業', val: `${selected.total_lessons}回` },
                  { label: '満足度',   val: `${selected.rating.toFixed(1)}/5` },
                  { label: 'フォロワー', val: `${selected.follower_count.toLocaleString()}` },
                ].map(s => (
                  <div key={s.label} className="bg-[--surface2] rounded-[10px] p-2.5 text-center">
                    <div className="text-[11px] text-[--text3] mb-1">{s.label}</div>
                    <div className="font-mono text-sm font-bold text-[--text]">{s.val}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => toggleFollow(selected.id)}
                className={clsx('w-full py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer transition-all border',
                  followedIds.has(selected.id)
                    ? 'bg-transparent text-[--text3] border-[--border2] hover:bg-red-50 hover:text-red-500'
                    : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-500')}>
                {followedIds.has(selected.id) ? 'フォロー中' : '＋ フォローする'}
              </button>
              <button onClick={() => window.location.href = `/endless-study`}
                className="w-full mt-2 bg-[--blue] text-white border-none py-2.5 rounded-[10px] text-sm font-semibold cursor-pointer hover:opacity-90">
                この講師で25分授業
              </button>
            </div>
          ) : (
            <div className="card p-5 text-center text-[--text3] text-sm">
              <Trophy size={32} className="mx-auto mb-3 opacity-30" />
              <p>講師をクリックして<br />詳細を表示</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
