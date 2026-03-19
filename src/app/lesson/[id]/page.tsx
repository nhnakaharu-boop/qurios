import { createServerSupabase } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import LessonClient from './LessonClient';

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const [profileRes, lessonRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('lessons')
      .select('*, student:student_id(id,display_name,username), tutor:tutor_id(id,display_name,username,follower_count,avg_rating,is_verified_tutor)')
      .eq('id', id)
      .single(),
  ]);

  if (!lessonRes.data) notFound();
  const lesson = lessonRes.data as Record<string, unknown>;
  const isParticipant = lesson.student_id === session.user.id || lesson.tutor_id === session.user.id;
  if (!isParticipant) redirect('/dashboard');

  return (
    <AppLayout profile={profileRes.data}>
      <LessonClient profile={profileRes.data} lesson={lesson as never} userId={session.user.id} />
    </AppLayout>
  );
}
