'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { Profile } from '@/types/database';
import { Crown, ExternalLink, Play, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const SUBJECTS: Record<string, string> = { math:'数学', english:'英語', chemistry:'化学', physics:'物理', biology:'生物', japanese:'国語', social:'社会', info:'情報' };

// Validate links: allow YouTube + general websites, block SNS personal accounts
function isYouTubeUrl(url: string) { return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url); }
function isBannedSns(url: string) {
  const banned = ['twitter.com', 'x.com', 'instagram.com', 'line.me', 'tiktok.com', 'facebook.com', 'threads.net'];
  return banned.some(b => url.includes(b));
}

const editSchema = z.object({
  display_name: z.string().min(1).max(50),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(160).optional(),
  grade: z.string().optional(),
  tutor_website_url: z.string().url().optional().or(z.literal('')),
  tutor_youtube_url: z.string().optional().or(z.literal('')),
  tutor_affiliate_url: z.string().url().optional().or(z.literal('')),
});
type EditData = z.infer<typeof editSchema>;

const BADGES = [
  { icon: '🔥', label: '7日連続' },
  { icon: '⭐', label: 'TOP10ランカー' },
  { icon: '🎓', label: '50授業達成' },
  { icon: '⚡', label: '3サイクル達成' },
];

interface Props { profile: Profile | null; challenges: Record<string, unknown>[]; }

export default function ProfileClient({ profile, challenges }: Props) {
  const [editing, setEditing] = useState(false);
  const supabase = createClient();
  const isTutor = profile?.role === 'tutor' || profile?.role === 'admin';
  const isPremiumTutor = profile?.plan === 'tutor_premium';

  const { register, handleSubmit, formState: { errors }, watch } = useForm<EditData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      grade: profile?.grade ?? '',
      tutor_website_url: profile?.tutor_website_url ?? '',
      tutor_youtube_url: profile?.tutor_youtube_url ?? '',
      tutor_affiliate_url: profile?.tutor_affiliate_url ?? '',
    },
  });

  async function onSave(data: EditData) {
    // Validate tutor links
    if (data.tutor_youtube_url && !isYouTubeUrl(data.tutor_youtube_url)) {
      toast.error('YouTubeのURLを入力してください（例：https://youtube.com/...）'); return;
    }
    if (data.tutor_website_url && isBannedSns(data.tutor_website_url)) {
      toast.error('Twitter・Instagram・LINEなどの個人SNSアカウントのリンクは貼れません'); return;
    }
    if (data.tutor_affiliate_url && isBannedSns(data.tutor_affiliate_url)) {
      toast.error('SNSアカウントのURLは使用できません'); return;
    }
    const { error } = await supabase.from('profiles').update({
      display_name: data.display_name,
      username: data.username,
      bio: data.bio,
      grade: data.grade,
      tutor_website_url: data.tutor_website_url || null,
      tutor_youtube_url: data.tutor_youtube_url || null,
      tutor_affiliate_url: data.tutor_affiliate_url || null,
    }).eq('id', profile?.id ?? '');
    if (error) { toast.error(error.message); return; }
    toast.success('プロフィールを保存しました');
    setEditing(false);
  }

  const STATS = [
    { n: profile?.monthly_lessons ?? 0,  l: '今月の授業', color: 'text-blue-600' },
    { n: profile?.total_answers ?? 0,    l: '総解答数',   color: 'text-teal-600' },
    { n: profile?.deviation_score?.toFixed(1) ?? '--', l: '偏差値', color: 'text-amber-600' },
    { n: profile?.follower_count ?? 0,   l: 'フォロワー', color: 'text-purple-600' },
    { n: profile?.endless_count ?? 0,    l: 'エンドレス', color: 'text-indigo-600' },
    { n: profile?.achievement_points ?? 0, l: '実績pt',   color: 'text-rose-600' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">

        {/* Hero */}
        <div className="card mb-5 overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-600 relative">
            <button className="absolute right-3 bottom-3 text-xs bg-black/30 text-white border border-white/30 rounded-[7px] px-3 py-1.5 cursor-pointer">
              カバーを変更
            </button>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-3">
              <div className="relative">
                <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-white dark:border-[--surface]">
                  {profile?.display_name?.[0] ?? '?'}
                </div>
                {profile?.is_verified_tutor && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <Crown size={12} className="text-white" />
                  </div>
                )}
              </div>
              <button onClick={() => setEditing(p => !p)}
                className="flex items-center gap-2 border border-[--border2] text-[--text2] hover:border-[--blue] hover:text-[--blue] bg-transparent rounded-[9px] px-4 py-2 text-sm font-medium cursor-pointer transition-all">
                <Edit2 size={14} />編集
              </button>
            </div>

            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-[20px] font-bold">{profile?.display_name}</div>
              {profile?.is_verified_tutor && (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Crown size={8} />公式講師
                </span>
              )}
            </div>
            <div className="text-sm text-[--text3] mb-2">@{profile?.username} · {profile?.grade ?? '学年未設定'}</div>
            {profile?.bio && <div className="text-sm text-[--text2] leading-relaxed mb-3 max-w-md">{profile.bio}</div>}

            {/* Subject tags */}
            {(profile?.subject_tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile!.subject_tags.map(s => (
                  <span key={s} className="text-xs font-medium bg-[--blue-lt] text-[--blue] border border-[--blue-mid] px-2.5 py-1 rounded-full">
                    {SUBJECTS[s] ?? s}
                  </span>
                ))}
              </div>
            )}

            {/* Tutor links (visible to all) */}
            {isTutor && (profile?.tutor_website_url || profile?.tutor_youtube_url || profile?.tutor_affiliate_url) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {profile?.tutor_youtube_url && (
                  <a href={profile.tutor_youtube_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 no-underline hover:bg-red-100 transition-colors">
                    <Play size={11} />YouTube
                  </a>
                )}
                {profile?.tutor_website_url && (
                  <a href={profile.tutor_website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-[--blue-lt] text-[--blue] border border-[--blue-mid] rounded-full px-3 py-1 no-underline hover:bg-blue-100 transition-colors">
                    <ExternalLink size={11} />サイト
                  </a>
                )}
                {profile?.tutor_affiliate_url && (
                  <a href={profile.tutor_affiliate_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 no-underline hover:bg-green-100 transition-colors">
                    <ExternalLink size={11} />アフィリエイト
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 flex-wrap pt-4 border-t border-[--border]">
              {STATS.map(s => (
                <div key={s.l} className="text-center">
                  <div className={`font-mono text-[17px] font-bold ${s.color}`}>{s.n}</div>
                  <div className="text-[11px] text-[--text3] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Achievement badges */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[--border]">
              {BADGES.map(b => (
                <div key={b.label} className="flex items-center gap-1.5 bg-[--surface2] border border-[--border] rounded-full px-2.5 py-1 text-[11px] font-medium">
                  <span>{b.icon}</span>{b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSubmit(onSave)} className="card p-6 mb-5">
            <div className="text-sm font-semibold mb-4 pb-3 border-b border-[--border]">✏️ プロフィール編集</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1">表示名</label>
                <input {...register('display_name')} className="input" />
                {errors.display_name && <p className="text-xs text-red-500 mt-1">{errors.display_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">ユーザーID</label>
                <input {...register('username')} className="input" />
                {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">自己紹介（160文字まで）</label>
              <textarea {...register('bio')} rows={3} className="input resize-none" />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">学年</label>
              <input {...register('grade')} className="input" placeholder="例：高校2年" />
            </div>

            {/* Tutor links section */}
            {isTutor && (
              <div className="border-t border-[--border] pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold">講師専用リンク</span>
                  {!isPremiumTutor && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">有料講師限定</span>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3 text-xs text-amber-800 leading-relaxed mb-3">
                  ⚠️ YouTube・販売サイト・アフィリエイトリンクのみ貼れます。Twitter・Instagram・LINE・TikTok等の個人SNSアカウントは貼れません。
                </div>

                <div className={!isPremiumTutor ? 'opacity-50 pointer-events-none' : ''}>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                      <Play size={12} className="text-red-500" />YouTubeチャンネル
                    </label>
                    <input {...register('tutor_youtube_url')} className="input" placeholder="https://youtube.com/@yourchannel" />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                      <ExternalLink size={12} />販売サイト / 自作サービス
                    </label>
                    <input {...register('tutor_website_url')} className="input" placeholder="https://your-shop.jp" />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                      <ExternalLink size={12} />アフィリエイトリンク
                    </label>
                    <input {...register('tutor_affiliate_url')} className="input" placeholder="https://affiliate.example.com/..." />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-[--border2] text-[--text2] bg-transparent rounded-[9px] py-2.5 text-sm cursor-pointer">キャンセル</button>
              <button type="submit" className="flex-1 bg-[--blue] text-white border-none rounded-[9px] py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90">保存する</button>
            </div>
          </form>
        )}

        {/* Challenges posted */}
        {challenges.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[--border] text-sm font-semibold">投稿した課題</div>
            {challenges.map(c => (
              <div key={c.id as string} className="flex items-center gap-3 px-5 py-3 border-b border-[--border] last:border-none">
                <div className="flex-1 text-sm font-medium truncate">{c.question as string ?? 'Challenge'}</div>
                <div className="text-xs text-[--text3]">♥ {c.like_count as number} · 📝 {c.answer_count as number}回解答</div>
                <CheckCircle size={14} className="text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
