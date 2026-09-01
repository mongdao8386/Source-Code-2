import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';
import { buildCsp } from '@/lib/security/csp';
import { ADMIN_INTERNAL, ADMIN_PATH } from '@/lib/admin-path';

const intlMiddleware = createIntlMiddleware(routing);

// Sub-paths of the CMS an unauthenticated visitor is allowed to reach.
const ADMIN_PUBLIC = new Set(['login', 'mfa']);

function notFound(csp: string) {
  return new NextResponse('Not Found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-security-policy': csp,
      'x-robots-tag': 'noindex',
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminArea =
    pathname === ADMIN_PATH ||
    pathname.startsWith(`${ADMIN_PATH}/`) ||
    pathname.startsWith(ADMIN_INTERNAL);
  const { header: csp } = buildCsp({ allowWasm: isAdminArea });

  // The CMS lives under /console but is only ever served through ADMIN_PATH.
  // Refuse the internal path so it cannot be used to skip the rename.
  if (pathname === ADMIN_INTERNAL || pathname.startsWith(`${ADMIN_INTERNAL}/`)) {
    return notFound(csp);
  }

  const isAdmin = pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);

  // ── CMS: no locale routing, its own guard ────────────────────────────────
  if (isAdmin) {
    const rest = pathname.slice(ADMIN_PATH.length).replace(/^\//, '');
    const seg = rest.split('/')[0] ?? '';
    const isPublicAdminRoute = ADMIN_PUBLIC.has(seg);

    const { response: authResponse, user, aal, supabase } = await updateSession(request);

    let isStaff = false;
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle();
      isStaff = !!data?.is_active && (data.role === 'owner' || data.role === 'admin');
    }

    // Not staff → the CMS does not exist. No redirect, no hint.
    if (!isStaff && !isPublicAdminRoute) {
      return notFound(csp);
    }

    // Staff but the second factor is not satisfied yet → force the TOTP step.
    if (isStaff && aal !== 'aal2' && seg !== 'mfa' && seg !== 'login') {
      const to = NextResponse.redirect(new URL(`${ADMIN_PATH}/mfa`, request.url));
      authResponse.cookies.getAll().forEach((c) => to.cookies.set(c));
      return to;
    }

    const target = new URL(`${ADMIN_INTERNAL}${rest ? `/${rest}` : ''}`, request.url);
    target.search = request.nextUrl.search;
    const rewritten = NextResponse.rewrite(target);
    authResponse.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
    rewritten.headers.set('content-security-policy', csp);
    rewritten.headers.set('x-robots-tag', 'noindex, nofollow');
    return rewritten;
  }

  // ── Public site: locale routing + session refresh ────────────────────────
  const intlResponse = intlMiddleware(request);
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  const { response: authResponse } = await updateSession(request);
  authResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c));

  intlResponse.headers.set('content-security-policy', csp);
  return intlResponse;
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
