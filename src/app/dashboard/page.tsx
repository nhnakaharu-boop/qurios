import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DashboardClient from './DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'ダッシュボード | Qurios' };

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Auto-create profile if missing (e.g. after OAuth)
  if (!profile) {
    const meta = session.user.user_metadata ?? {};
    const displayName = meta.display_name ?? meta.full_name ?? meta.name ?? session.user.email?.split('@')[0] ?? 'ユーザー';
    const { data: newProfile } = await supabase.from('profiles').insert({
      id: session.user.id,
      username: `user_${session.user.id.slice(0, 8)}`,
      display_name: displayName,
      role: (meta.role as 'student' | 'tutor') ?? 'student',
      plan: 'free',
      birth_date: meta.birth_date ?? '2000-01-01',
    }).select().single();
    profile = newProfile;
  }

  const [lessonsRes, challengesRes, rankingRes] = await Promise.all([
    supabase.from('lessons')
      .select('id, content, subject, status, ended_at, created_at, tutor:tutor_id(display_name)')
      .eq('student_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('challenges')
      .select('id, question, subject, like_count, answer_count, author:author_id(display_name, username)')
      .eq('is_published', true)
      .order('like_count', { ascending: false })
      .limit(3),
    supabase.from('rankings')
      .select('rank_pos, score')
      .eq('user_id', session.user.id)
      .is('subject', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <AppLayout profile={profile}>
      <DashboardClient
        profile={profile}
        recentLessons={lessonsRes.data ?? []}
        recommendedChallenges={challengesRes.data ?? []}
        ranking={rankingRes.data ?? null}
      />
    </AppLayout>
  );
}
