import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes accessible without authentication
const PUBLIC_ROUTES = new Set(['/auth/login', '/auth/signup', '/auth/callback', '/', '/pricing', '/consultants', '/marketplace', '/library', '/t', '/about', '/team', '/contact', '/faq', '/privacy', '/terms', '/cookies', '/refund', '/ai-disclaimer', '/consultant-disclaimer']);
// API routes that are public (sectors is publicly readable)
const PUBLIC_API = new Set(['/api/sectors', '/api/stripe/webhook', '/api/consultants', '/api/marketplace/products', '/api/library', '/api/payg/prices', '/api/bi/help', '/api/bi/funding']);

export async function middleware(request: NextRequest) {
  // Bot protection on API routes
  // Bot protection on API routes
  const reqPath = request.nextUrl.pathname;
  const ua = request.headers.get('user-agent') ?? '';
  if (reqPath.startsWith('/api/') && reqPath !== '/api/stripe/webhook') {
    if (/bot|crawler|spider|scraper|headless|selenium|puppeteer|playwright|python-requests/i.test(ua)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Tenant custom domain routing
  const tenantSlug = await resolveTenantSlug(request);
  if (tenantSlug) {
    const url = request.nextUrl.clone();
    url.pathname = `/t/${tenantSlug}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url, { request });
  }

  const { pathname } = request.nextUrl;

  // Static files & Next.js internals — always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API.has(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser — validates token with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated user hitting protected API → 401
  if (!user && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Unauthenticated user hitting protected page → login
  if (!user && !PUBLIC_ROUTES.has(pathname)) {
    const loginUrl = (request.nextUrl as any).clone ? (request.nextUrl as any).clone() : new URL(request.nextUrl.toString());
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting auth pages → dashboard
  if (user && pathname.startsWith('/auth') && pathname !== '/auth/callback') {
    const dashUrl = (request.nextUrl as any).clone ? (request.nextUrl as any).clone() : new URL(request.nextUrl.toString());
    dashUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashUrl);
  }

  return response;
}


// Tenant domain routing: if custom domain matches a tenant, rewrite to /t/[slug]
async function resolveTenantSlug(request: NextRequest): Promise<string | null> {
  const host = request.headers.get('host') ?? '';
  // Skip known platform domains
  if (host.includes('monshaati') || host.includes('localhost') || host.includes('vercel')) {
    return null;
  }
  // Look up custom domain in Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tenants?custom_domain=eq.${host}&is_active=eq.true&select=slug&limit=1`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    if (res.ok) {
      const data = await res.json() as { slug: string }[];
      return data[0]?.slug ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|t/[^/]+/assets).*)',
  ],
};
