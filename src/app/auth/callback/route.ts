import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  if (data.user) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existing) {
      const meta = data.user.user_metadata ?? {};
      const displayName = meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? 'ユーザー';
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: `user_${data.user.id.slice(0, 8)}`,
        display_name: displayName,
        role: (meta.role as 'student' | 'tutor') ?? 'student',
        plan: 'free',
        birth_date: meta.birth_date ?? '2000-01-01',
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
