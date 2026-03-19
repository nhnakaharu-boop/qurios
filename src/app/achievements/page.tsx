import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import AchievementsClient from './AchievementsClient';

export default async function AchievementsPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  const [profileRes, allAchsRes, userAchsRes, streakRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('achievements').select('*').order('points'),
    supabase.from('user_achievements').select('*, achievement:achievement_id(*)').eq('user_id', session.user.id),
    supabase.from('study_streaks').select('*').eq('user_id', session.user.id).maybeSingle(),
  ]);
  return (
    <AppLayout profile={profileRes.data}>
      <AchievementsClient profile={profileRes.data} allAchievements={allAchsRes.data ?? []} userAchievements={userAchsRes.data ?? []} streak={streakRes.data} />
    </AppLayout>
  );
}
