import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PostClient from './PostClient';

export default async function PostPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return (
    <AppLayout profile={profile}>
      <PostClient profile={profile} />
    </AppLayout>
  );
}
