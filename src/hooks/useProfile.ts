'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

export function useProfile() {
  const { profile, setProfile } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    if (profile) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setProfile(null); return; }
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return profile;
}
