import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/auth/reset',
  '/api/webhook',
  '/terms',
  '/privacy',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public & static paths
  if (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|map)$/.test(pathname)
  ) {
    return addSecurityHeaders(NextResponse.next({ request }));
  }

  let response = NextResponse.next({ request });

  // Use new @supabase/ssr 0.6 cookie API
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Earnings: tutor only
  if (pathname.startsWith('/earnings')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profile?.role !== 'tutor' && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return addSecurityHeaders(response);
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=self, microphone=self, geolocation=()');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
