import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  const { data: challenges } = await supabase.from('challenges').select('id, like_count, answer_count').eq('author_id', session.user.id).limit(10);
  return (
    <AppLayout profile={profile}>
      <ProfileClient profile={profile} challenges={challenges ?? []} />
    </AppLayout>
  );
}
