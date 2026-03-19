import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import TutorRankingClient from './TutorRankingClient';

export default async function TutorRankingPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const [profileRes, tutorsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('profiles')
      .select('id, display_name, avatar_url, is_verified_tutor, follower_count, monthly_lessons, total_lessons, subject_tags, plan, last_seen_at, tutor_youtube_url')
      .eq('role', 'tutor')
      .eq('is_active', true)
      .order('monthly_lessons', { ascending: false })
      .limit(30),
  ]);

  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
  const followedIds = new Set((follows ?? []).map((f: Record<string, unknown>) => f.following_id as string));

  return (
    <AppLayout profile={profileRes.data}>
      <TutorRankingClient tutors={tutorsRes.data ?? []} followedIds={followedIds} myProfile={profileRes.data} />
    </AppLayout>
  );
}
