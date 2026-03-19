'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Profile } from '@/types/database';
import { Users, UserPlus, UserCheck, Star, Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';
import ReportButton from '@/components/ui/ReportButton';

type Tab = 'friends' | 'follow' | 'groups' | 'requests' | 'find';

interface Props {
  profile: Profile | null;
  friends: Record<string, unknown>[];
  requests: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  following: Record<string, unknown>[];
}

export default function SocialClient({ profile, friends, requests, groups, following }: Props) {
  const [tab, setTab] = useState<Tab>('friends');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Profile>[]>([]);
  const [searching, setSearching] = useState(false);
  const supabase = createClient();

  async function acceptRequest(userId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', userId).eq('friend_id', profile?.id);
    toast.success('フレンド申請を承認しました');
  }
  async function denyRequest(userId: string) {
    await supabase.from('friendships').delete().eq('user_id', userId).eq('friend_id', profile?.id);
    toast('申請を拒否しました');
  }
  async function unfollowTutor(tutorId: string) {
    await supabase.from('follows').delete().eq('follower_id', profile?.id).eq('following_id', tutorId);
    toast('フォローを解除しました');
  }
  async function sendFriendRequest(targetId: string) {
    if (!profile) return;
    const { error } = await supabase.from('friendships').insert({ user_id: profile.id, friend_id: targetId, status: 'pending' });
    if (error) { toast.error('既に申請済みかフレンドです'); return; }
    toast.success('フレンド申請を送りました！');
  }
  async function followTutor(tutorId: string) {
    if (!profile) return;
    await supabase.from('follows').insert({ follower_id: profile.id, following_id: tutorId });
    toast.success('フォローしました！');
  }
  async function createGroup() {
    if (!groupName.trim() || !profile) return;
    const { data: grp, error } = await supabase.from('groups').insert({ name: groupName, description: groupDesc, owner_id: profile.id }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from('group_members').insert({ group_id: grp.id, user_id: profile.id, role: 'owner' });
    toast.success('グループを作成しました！'); setShowCreateGroup(false); setGroupName(''); setGroupDesc('');
  }
  async function searchUsers() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('profiles').select('id, display_name, username, role, plan, is_verified_tutor, follower_count, last_seen_at').or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`).eq('is_active', true).limit(20);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  const TABS = [
    { key: 'friends' as Tab, label: 'フレンド',    icon: Users,     count: friends.length },
    { key: 'follow'  as Tab, label: 'フォロー',    icon: Star,      count: following.length },
    { key: 'groups'  as Tab, label: 'グループ',    icon: Users,     count: groups.length },
    { key: 'find'    as Tab, label: 'ユーザー検索', icon: Search,    count: 0 },
    { key: 'requests' as Tab, label: '申請',       icon: UserPlus,  count: requests.length },
  ];

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[--surface] border-b border-[--border] px-6 py-4 sticky top-0 z-10">
          <h1 className="text-[18px] font-bold tracking-tight mb-3">フレンド・グループ</h1>
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer border-none bg-transparent whitespace-nowrap',
                  tab === t.key ? 'text-[--blue] border-[--blue]' : 'text-[--text3] border-transparent hover:text-[--text2]')}>
                {t.label}
                {t.count > 0 && (
                  <span className={clsx('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full', t.key === 'requests' ? 'bg-red-500 text-white' : 'bg-[--surface2]')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-2xl">

          {/* SEARCH TAB */}
          {tab === 'find' && (
            <div>
              <div className="flex gap-2 mb-5">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUsers()}
                  className="input flex-1" placeholder="ユーザー名・表示名で検索..." />
                <button onClick={searchUsers} disabled={searching}
                  className="bg-[--blue] text-white border-none rounded-[10px] px-5 py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50">
                  {searching ? '...' : '検索'}
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map(u => {
                  const isOnline = u.last_seen_at && (Date.now() - new Date(u.last_seen_at as string).getTime()) < 5 * 60 * 1000;
                  return (
                    <div key={u.id} className="card flex items-center gap-3 p-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(u.display_name ?? '?')[0]}
                        </div>
                        {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {u.display_name}
                          {u.is_verified_tutor && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">公式</span>}
                        </div>
                        <div className="text-xs text-[--text3]">@{u.username} · {u.role === 'tutor' ? '講師' : '生徒'}</div>
                      </div>
                      <div className="flex gap-2">
                        {u.role === 'student' && (
                          <button onClick={() => sendFriendRequest(u.id!)}
                            className="text-xs bg-[--blue] text-white border-none rounded-[8px] px-3 py-1.5 cursor-pointer hover:opacity-90">申請</button>
                        )}
                        {u.role === 'tutor' && (
                          <button onClick={() => followTutor(u.id!)}
                            className="text-xs bg-teal-600 text-white border-none rounded-[8px] px-3 py-1.5 cursor-pointer hover:bg-teal-500">フォロー</button>
                        )}
                        <ReportButton reportedUserId={u.id!} reportedUserName={u.display_name} size="sm" variant="icon" />
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && searchQuery && !searching && (
                  <div className="text-center py-10 text-[--text3] text-sm">ユーザーが見つかりませんでした</div>
                )}
              </div>
            </div>
          )}

          {/* FRIENDS */}
          {tab === 'friends' && (
            <div className="space-y-2">
              <div className="flex gap-2 mb-4">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input flex-1 text-sm" placeholder="フレンドを検索..." />
              </div>
              {friends.length === 0 ? (
                <div className="text-center py-12 text-[--text3]">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>フレンドがいません。「ユーザー検索」からフレンド申請しましょう！</p>
                </div>
              ) : friends.filter(f => {
                  const fr = f.friend as Record<string, unknown>;
                  const n = fr?.display_name as string ?? '';
                  return !searchQuery || n.includes(searchQuery);
                }).map(f => {
                  const friend = f.friend as Record<string, unknown>;
                  const isOnline = friend?.last_seen_at && (Date.now() - new Date(friend.last_seen_at as string).getTime()) < 5 * 60 * 1000;
                  return (
                    <div key={f.id as string} className="card flex items-center gap-3 p-4 hover:border-[--border2] transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(friend?.display_name as string)?.[0] ?? '?'}
                        </div>
                        <span className={clsx('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white', isOnline ? 'bg-green-500' : 'bg-gray-400')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{friend?.display_name as string}</div>
                        <div className="text-xs text-[--text3]">@{friend?.username as string} · {isOnline ? 'オンライン' : '最終ログイン ' + new Date(friend?.last_seen_at as string).toLocaleDateString('ja')}</div>
                      </div>
                      <ReportButton reportedUserId={friend?.id as string} reportedUserName={friend?.display_name as string} size="sm" />
                      <button onClick={async () => { await supabase.from('friendships').delete().eq('id', f.id as string); toast('フレンドを削除しました'); }}
                        className="text-xs text-[--text3] border border-[--border2] rounded-[8px] px-3 py-1.5 cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all bg-transparent">
                        削除
                      </button>
                    </div>
                  );
              })}
            </div>
          )}

          {/* FOLLOW */}
          {tab === 'follow' && (
            <div>
              <div className="bg-[--blue-lt] border border-[--blue-mid] rounded-[10px] p-3.5 text-sm text-[--blue] mb-4 leading-relaxed">
                ℹ️ フォロー機能は<strong>講師のみ</strong>対象です。
              </div>
              <div className="space-y-2">
                {following.map(f => {
                  const tutor = f.tutor as Record<string, unknown>;
                  return (
                    <div key={f.id as string} className="card flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(tutor?.display_name as string)?.[0] ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {tutor?.display_name as string}
                          {tutor?.is_verified_tutor && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">公式</span>}
                        </div>
                        <div className="text-xs text-[--text3]">👥 {(tutor?.follower_count as number)?.toLocaleString()}フォロワー</div>
                      </div>
                      <ReportButton reportedUserId={tutor?.id as string} reportedUserName={tutor?.display_name as string} size="sm" />
                      <button onClick={() => unfollowTutor(tutor?.id as string)}
                        className="text-xs text-[--text3] border border-[--border2] rounded-full px-3 py-1.5 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all bg-transparent">
                        フォロー中
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GROUPS */}
          {tab === 'groups' && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {groups.map(gm => {
                  const g = gm.group as Record<string, unknown>;
                  return (
                    <div key={gm.id as string} className="card p-4 hover:border-[--border2] transition-colors cursor-pointer">
                      <div className="w-11 h-11 rounded-[12px] bg-[--blue-lt] flex items-center justify-center text-xl mb-3">👥</div>
                      <div className="text-sm font-semibold mb-1">{g?.name as string}</div>
                      <div className="text-xs text-[--text3] mb-3 line-clamp-2">{g?.description as string ?? '説明なし'}</div>
                      <div className="flex items-center justify-between pt-2 border-t border-[--border]">
                        <span className="text-xs text-[--text3]">{g?.member_count as number}名</span>
                        <button className="text-xs font-semibold text-teal-700 bg-[--teal-lt] border border-teal-200 rounded-[6px] px-2.5 py-1 cursor-pointer">▶ グループ授業</button>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowCreateGroup(true)}
                  className="border-2 border-dashed border-[--border2] rounded-[14px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[--blue] hover:bg-[--blue-lt] transition-all bg-transparent min-h-[130px]">
                  <Plus size={28} className="text-[--text3]" />
                  <span className="text-sm text-[--text3]">グループを作成</span>
                  <span className="text-xs text-[--text3]">最大40名</span>
                </button>
              </div>
            </div>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-10 text-[--text3]"><UserCheck size={32} className="mx-auto mb-2 opacity-30" /><p>新しい申請はありません</p></div>
              ) : requests.map(r => {
                const user = r.user as Record<string, unknown>;
                return (
                  <div key={r.id as string} className="flex items-center gap-3 bg-[--blue-lt] border border-[--blue-mid] rounded-[12px] p-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(user?.display_name as string)?.[0] ?? '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{user?.display_name as string}</div>
                      <div className="text-xs text-[--text3]">@{user?.username as string}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(user?.id as string)} className="bg-[--blue] text-white border-none rounded-[8px] px-3.5 py-2 text-xs font-semibold cursor-pointer">承認</button>
                      <button onClick={() => denyRequest(user?.id as string)} className="bg-transparent text-[--text2] border border-[--border2] rounded-[8px] px-3.5 py-2 text-xs cursor-pointer">拒否</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => e.target === e.currentTarget && setShowCreateGroup(false)}>
          <div className="bg-[--surface] rounded-[18px] p-7 w-[380px] border border-[--border2]">
            <h2 className="text-[17px] font-bold mb-5">グループを作成</h2>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1.5">グループ名</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} className="input" placeholder="例：数学受験対策班" />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1.5">説明（任意）</label>
              <input value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="input" placeholder="どんなグループか" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateGroup(false)} className="flex-1 border border-[--border2] text-[--text2] bg-transparent rounded-[9px] py-2.5 text-sm cursor-pointer">キャンセル</button>
              <button onClick={createGroup} className="flex-1 bg-[--blue] text-white border-none rounded-[9px] py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90">作成する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
