import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  const [profileRes, notifsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30),
  ]);
  // Mark all as read
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
  return (
    <AppLayout profile={profileRes.data}>
      <NotificationsClient notifications={notifsRes.data ?? []} />
    </AppLayout>
  );
}
