import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import EarningsClient from './EarningsClient';

export default async function EarningsPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (profile?.role !== 'tutor' && profile?.role !== 'admin') redirect('/dashboard');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [earningsRes, payoutsRes] = await Promise.all([
    supabase.from('earnings').select('*').eq('tutor_id', session.user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('payouts').select('*').eq('tutor_id', session.user.id).order('created_at', { ascending: false }).limit(6),
  ]);

  return (
    <AppLayout profile={profile}>
      <EarningsClient profile={profile} earnings={earningsRes.data ?? []} payouts={payoutsRes.data ?? []} currentMonth={thisMonth} />
    </AppLayout>
  );
}
