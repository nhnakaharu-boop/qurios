import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import MembershipClient from './MembershipClient';

export default async function MembershipPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const [profileRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('memberships')
      .select('*, tutor:tutor_id(id, display_name, is_verified_tutor, follower_count, plan)')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(20),
  ]);

  return (
    <AppLayout profile={profileRes.data}>
      <MembershipClient profile={profileRes.data} memberships={membershipsRes.data ?? []} />
    </AppLayout>
  );
}
