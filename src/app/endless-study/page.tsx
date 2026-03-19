import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import EndlessStudyClient from './EndlessStudyClient';

export default async function EndlessStudyPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

  // Only paid students/tutors can use this
  const canAccess = ['student_premium', 'student_premium_all', 'tutor_premium'].includes(profile?.plan ?? '');
  if (!canAccess) redirect('/dashboard?upgrade=endless');

  // Get followed tutors who are online
  const { data: following } = await supabase
    .from('follows')
    .select('tutor:following_id(id, display_name, avatar_url, role, plan, is_verified_tutor, follower_count, subject_tags, last_seen_at)')
    .eq('follower_id', session.user.id)
    .limit(20);

  const onlineTutors = (following ?? [])
    .map((f: Record<string, unknown>) => f.tutor as Record<string, unknown>)
    .filter((t): t is Record<string, unknown> => {
      if (!t) return false;
      const lastSeen = t.last_seen_at as string;
      return lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000 : false;
    });

  return (
    <AppLayout profile={profile}>
      <EndlessStudyClient profile={profile} onlineTutors={onlineTutors} />
    </AppLayout>
  );
}
