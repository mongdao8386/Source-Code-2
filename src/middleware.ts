import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';
import { buildCsp } from '@/lib/security/csp';

const intlMiddleware = createIntlMiddleware(routing);

const ADMIN_RE = /^\/(vi|en)\/admin(?:\/(.*))?$/;
// Sub-paths under /admin that an unauthenticated visitor is allowed to reach.
const ADMIN_PUBLIC = new Set(['login', 'mfa']);

function firstSegment(sub: string | undefined): string {
  return (sub ?? '').split('/').filter(Boolean)[0] ?? '';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { header: csp } = buildCsp();

  // 1. Locale routing (may issue a redirect for a missing/!matching prefix).
  const intlResponse = intlMiddleware(request);
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  // 2. Refresh the Supabase session and learn who (if anyone) is signed in.
  const { response: authResponse, user, aal, supabase } =
    await updateSession(request);

  // Carry refreshed auth cookies onto the intl response we will actually return.
  authResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c));

  // 3. Guard the CMS.
  const match = pathname.match(ADMIN_RE);
  if (match) {
    const locale = match[1]!;
    const seg = firstSegment(match[2]);
    const isPublicAdminRoute = ADMIN_PUBLIC.has(seg);

    let isStaff = false;
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle();
      isStaff = !!data?.is_active && (data.role === 'owner' || data.role === 'admin');
    }

    // Not staff → the CMS does not exist. Plain 404, no redirect, no hint.
    if (!isStaff && !isPublicAdminRoute) {
      return new NextResponse('Not Found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-security-policy': csp,
          'x-robots-tag': 'noindex',
        },
      });
    }

    // Staff but second factor not yet satisfied → force the TOTP step.
    if (isStaff && aal !== 'aal2' && seg !== 'mfa' && seg !== 'login') {
      const to = NextResponse.redirect(new URL(`/${locale}/admin/mfa`, request.url));
      authResponse.cookies.getAll().forEach((c) => to.cookies.set(c));
      return to;
    }
  }

  intlResponse.headers.set('content-security-policy', csp);
  return intlResponse;
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
