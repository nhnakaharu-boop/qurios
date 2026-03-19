'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Profile, Membership } from '@/types/database';
import { Crown, Users, Play, Plus, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

// Validate YouTube URL only
function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);
}
// Block SNS personal accounts
function isBannedUrl(url: string): boolean {
  const banned = ['twitter.com', 'x.com', 'instagram.com', 'line.me', 'tiktok.com', 'facebook.com', 'threads.net'];
  return banned.some(b => url.includes(b));
}

const MOCK_MEMBERSHIPS = [
  { id: 'M1', title: '田中先生の数学マスタークラス', description: '微積分・線形代数を徹底解説。月4回のライブ授業動画付き。', price_yen: 980, member_count: 234, tutor: { display_name: '田中 数学講師', is_verified_tutor: true, follower_count: 1240 } },
  { id: 'M2', title: '鈴木の英語完全攻略',            description: 'TOEIC満点講師による英語学習メソッド。毎週新作動画投稿。', price_yen: 1480, member_count: 189, tutor: { display_name: '鈴木 英語講師', is_verified_tutor: false, follower_count: 892 } },
  { id: 'M3', title: '理科専門家の実験授業チャンネル', description: '化学・物理の実験動画と解説問題。大学受験対策。', price_yen: 1980, member_count: 98, tutor: { display_name: '中村 理科講師', is_verified_tutor: true, follower_count: 564 } },
];

interface Props { profile: Profile | null; memberships: (Membership & { tutor: Partial<Profile> })[]; }

export default function MembershipClient({ profile, memberships }: Props) {
  const [createMode, setCreateMode] = useState(false);
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [price, setPrice]       = useState('980');
  const [newYtUrl, setNewYtUrl] = useState('');
  const [ytUrls, setYtUrls]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const supabase = createClient();
  const isTutor = profile?.role === 'tutor' || profile?.role === 'admin';
  const isPremiumTutor = profile?.plan === 'tutor_premium';
  const data = memberships.length > 0 ? memberships : MOCK_MEMBERSHIPS;

  function addYtUrl() {
    const url = newYtUrl.trim();
    if (!url) return;
    if (isBannedUrl(url)) { toast.error('Twitter・Instagram・LINEなどのSNS個人アカウントのリンクは貼れません'); return; }
    if (!isYouTubeUrl(url)) { toast.error('YouTubeのリンクのみ貼ることができます（例：https://youtube.com/...）'); return; }
    if (ytUrls.length >= 10) { toast.error('URLは最大10個まで'); return; }
    setYtUrls(p => [...p, url]);
    setNewYtUrl('');
  }

  async function createMembership() {
    if (!profile || !isTutor || !isPremiumTutor) return;
    if (!title.trim()) { toast.error('タイトルを入力してください'); return; }
    if (!price || Number(price) < 100) { toast.error('料金は100円以上で設定してください'); return; }
    setLoading(true);
    const { error } = await supabase.from('memberships').insert({
      tutor_id: profile.id, title, description: desc, price_yen: Number(price),
    });
    if (error) { toast.error(error.message); } else { toast.success('メンバーシップを作成しました！'); setCreateMode(false); setTitle(''); setDesc(''); setPrice('980'); }
    setLoading(false);
  }

  async function joinMembership(id: string, price: number) {
    toast(`¥${price.toLocaleString()}/月のメンバーシップに参加します（Stripe決済）`);
  }

  return (
    <div className="p-7 max-w-[900px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">メンバーシップ</h1>
          <p className="text-sm text-[--text2] mt-1">講師の専用チャンネルに参加してYouTube授業動画を視聴できます</p>
        </div>
        {isTutor && isPremiumTutor && (
          <button onClick={() => setCreateMode(p => !p)}
            className="flex items-center gap-2 bg-[--blue] text-white border-none rounded-[10px] px-4 py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90">
            <Plus size={16} />メンバーシップを作成
          </button>
        )}
        {isTutor && !isPremiumTutor && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">
            有料講師プランのみ作成可能
          </div>
        )}
      </div>

      {/* Create form */}
      {createMode && (
        <div className="card p-6 mb-6">
          <div className="text-sm font-semibold mb-4 pb-3 border-b border-[--border]">メンバーシップを作成</div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5">タイトル</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="例：田中先生の数学マスタークラス" maxLength={60} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5">説明</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input resize-none" rows={3} placeholder="メンバーシップの内容を説明" maxLength={500} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">月額料金（円）</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input" min={100} max={100000} />
            </div>
          </div>

          {/* YouTube links */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5">YouTubeリンク（最大10件）</label>
            <div className="bg-amber-50 border border-amber-200 rounded-[9px] p-3 text-xs text-amber-800 mb-2 leading-relaxed">
              ⚠️ YouTubeリンクのみ貼れます。Twitter・Instagram・LINE・TikTokなどの個人SNSアカウントは貼れません。
            </div>
            <div className="flex gap-2 mb-2">
              <input value={newYtUrl} onChange={e => setNewYtUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addYtUrl()}
                className="input flex-1 text-sm" placeholder="https://youtube.com/watch?v=..." />
              <button onClick={addYtUrl} className="bg-red-600 text-white border-none rounded-[9px] px-4 text-sm font-medium cursor-pointer">
                追加
              </button>
            </div>
            {ytUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[--text2] mb-1">
                <Play size={12} className="text-red-500 shrink-0" />
                <span className="truncate flex-1">{url}</span>
                <button onClick={() => setYtUrls(p => p.filter((_, j) => j !== i))} className="text-red-400 border-none bg-transparent cursor-pointer text-xs">削除</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCreateMode(false)} className="btn-outline flex-1 text-sm py-2.5">キャンセル</button>
            <button onClick={createMembership} disabled={loading}
              className="bg-[--blue] text-white border-none rounded-[10px] py-2.5 px-6 text-sm font-semibold cursor-pointer disabled:opacity-50 flex-1">
              {loading ? '作成中...' : '作成する'}
            </button>
          </div>
        </div>
      )}

      {/* Membership grid */}
      <div className="grid grid-cols-2 gap-4">
        {data.map((m: Record<string, unknown>) => {
          const tutor = m.tutor as Record<string, unknown>;
          return (
            <div key={m.id as string} className="card p-5 hover:border-[--border2] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {(tutor?.display_name as string)?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{tutor?.display_name as string}</span>
                    {tutor?.is_verified_tutor && (
                      <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                        <Crown size={7} />公式
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[--text3]">👥 {(tutor?.follower_count as number)?.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-sm font-semibold mb-2 leading-snug">{m.title as string}</div>
              <div className="text-xs text-[--text2] leading-relaxed mb-4 line-clamp-2">{m.description as string}</div>
              <div className="flex items-center gap-3 pt-3 border-t border-[--border]">
                <div>
                  <div className="text-[18px] font-bold text-[--blue] font-mono">¥{(m.price_yen as number)?.toLocaleString()}</div>
                  <div className="text-[11px] text-[--text3]">/ 月 · <Users size={10} className="inline" /> {m.member_count as number}人</div>
                </div>
                <button onClick={() => joinMembership(m.id as string, m.price_yen as number)}
                  className="ml-auto bg-[--blue] text-white border-none rounded-[9px] px-4 py-2 text-sm font-semibold cursor-pointer hover:opacity-90">
                  参加する
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
