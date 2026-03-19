import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import LessonHistoryClient from './LessonHistoryClient';

export default async function LessonHistoryPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const [profileRes, lessonsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('lessons')
      .select('*, tutor:tutor_id(display_name, username), student:student_id(display_name)')
      .or(`student_id.eq.${session.user.id},tutor_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <AppLayout profile={profileRes.data}>
      <LessonHistoryClient lessons={lessonsRes.data ?? []} userId={session.user.id} />
    </AppLayout>
  );
}
