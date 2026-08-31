import { clientEnv } from '@/lib/env';

/**
 * Builds a strict, nonce-based Content-Security-Policy for a single request.
 * The nonce is surfaced to the app via the `x-nonce` header so `next/script`
 * and inline bootstrap scripts can echo it.
 */
export function buildCsp() {
  const nonce = btoa(crypto.randomUUID());
  const supabase = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const isDev = process.env.NODE_ENV !== 'production';

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'blob:', supabase],
    'connect-src': ["'self'", supabase, ...(isDev ? ['ws:'] : [])],
    'media-src': ["'self'", supabase],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'upgrade-insecure-requests': [],
  };

  const header = Object.entries(directives)
    .map(([key, val]) => (val.length ? `${key} ${val.join(' ')}` : key))
    .join('; ');

  return { nonce, header };
}
