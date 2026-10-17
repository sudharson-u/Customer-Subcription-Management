import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('your_supabase') || key.includes('your_supabase')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/offline.html' ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/logo') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isLandingPage = request.nextUrl.pathname === '/';
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/api/push') ||
    request.nextUrl.pathname.startsWith('/api/auth/demo');

  if (!isSupabaseConfigured()) {
    const hasDemoSession = request.cookies.get('demo_session')?.value === 'true';

    if (!hasDemoSession && !isAuthPage && !isPublicRoute && !isLandingPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (hasDemoSession && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const hasDemoSession = request.cookies.get('demo_session')?.value === 'true';
  let isAuthenticated = hasDemoSession;

  if (!isAuthenticated) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      isAuthenticated = !!user;
    } catch {
      isAuthenticated = false;
    }
  }

  if (pathname.startsWith('/api/') && !isAuthenticated && !isPublicRoute) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAuthenticated && !isAuthPage && !isPublicRoute && !isLandingPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
