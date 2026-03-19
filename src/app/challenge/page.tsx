import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ChallengeClient from './ChallengeClient';

export default async function ChallengePage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  const [profileRes, challengesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('challenges').select('*, author:author_id(id, display_name, username, follower_count, role)').eq('is_published', true).order('created_at', { ascending: false }).limit(20),
  ]);
  return (
    <AppLayout profile={profileRes.data}>
      <ChallengeClient profile={profileRes.data} initialChallenges={challengesRes.data ?? []} />
    </AppLayout>
  );
}
