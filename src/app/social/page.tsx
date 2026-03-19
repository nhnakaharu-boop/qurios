import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import SocialClient from './SocialClient';

export default async function SocialPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const [profileRes, friendsRes, requestsRes, groupsRes, followingRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('friendships').select('*, friend:friend_id(id, display_name, username, avatar_url, role, last_seen_at)').eq('user_id', session.user.id).eq('status', 'accepted').limit(20),
    supabase.from('friendships').select('*, user:user_id(id, display_name, username, role)').eq('friend_id', session.user.id).eq('status', 'pending').limit(10),
    supabase.from('group_members').select('*, group:group_id(id, name, description, member_count, visibility)').eq('user_id', session.user.id).limit(10),
    supabase.from('follows').select('*, tutor:following_id(id, display_name, username, follower_count, role)').eq('follower_id', session.user.id).limit(20),
  ]);

  return (
    <AppLayout profile={profileRes.data}>
      <SocialClient
        profile={profileRes.data}
        friends={friendsRes.data ?? []}
        requests={requestsRes.data ?? []}
        groups={groupsRes.data ?? []}
        following={followingRes.data ?? []}
      />
    </AppLayout>
  );
}
