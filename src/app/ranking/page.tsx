import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RankingClient from './RankingClient';

export default async function RankingPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const now = new Date();
  const weekKey = `${now.getFullYear()}-W${String(Math.ceil((now.getDate() + (new Date(now.getFullYear(), now.getMonth(), 1).getDay())) / 7)).padStart(2, '0')}`;

  const [profileRes, rankingsRes, myRankRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('rankings').select('*, user:user_id(id, display_name, username, avatar_url)').eq('week', weekKey).is('subject', null).order('score', { ascending: false }).limit(20),
    supabase.from('rankings').select('*').eq('user_id', session.user.id).eq('week', weekKey).is('subject', null).single(),
  ]);

  return (
    <AppLayout profile={profileRes.data}>
      <RankingClient profile={profileRes.data} rankings={rankingsRes.data ?? []} myRank={myRankRes.data} />
    </AppLayout>
  );
}
