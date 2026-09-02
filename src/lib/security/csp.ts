import { clientEnv } from '@/lib/env';

/**
 * Content-Security-Policy for the app.
 *
 * Why no nonce / 'strict-dynamic':
 *   Most public pages are prerendered at build time (SSG + ISR — see the
 *   `revalidate` exports under app/[locale]/(site)). A nonce is per-request, so
 *   it cannot be baked into HTML that was generated during `next build`; the
 *   scripts would carry no nonce and 'strict-dynamic' would then block every
 *   one of them, leaving the site rendered but completely inert. Next also
 *   emits ~13 inline RSC-payload scripts per page whose hashes change with the
 *   content, so hashing is not workable either.
 *
 *   'unsafe-inline' is therefore a deliberate trade for keeping pages static.
 *   The injection surface it would protect is already closed by construction:
 *   the app never calls dangerouslySetInnerHTML (ESLint `react/no-danger` is an
 *   error), CMS markdown is rendered into React elements by components/site/
 *   Prose.tsx rather than parsed into HTML, and every other value goes through
 *   React's escaping. If a page ever needs to render raw HTML, revisit this.
 *
 * Everything else stays locked down: no framing, no plugins, no arbitrary
 * origins — only self and the Supabase project.
 */
export function buildCsp({ allowWasm = false }: { allowWasm?: boolean } = {}) {
  const isDev = process.env.NODE_ENV !== 'production';

  // NEXT_PUBLIC_* is inlined at build time, so a container built without the
  // real project URL would emit a CSP that blocks its own Supabase calls. Pair
  // the configured origin with the managed-Supabase wildcard so the policy is
  // correct either way.
  const supabase = [clientEnv.NEXT_PUBLIC_SUPABASE_URL, 'https://*.supabase.co'];

  // The ffmpeg core is ~32 MB and the VPS serves it at about 50 KB/s, so the
  // CMS pulls it from jsDelivr and keeps the same-origin copy as a fallback.
  // Granted only alongside allowWasm — the public site never loads it and
  // keeps a policy with no external origins at all.
  const ffmpegCdn = allowWasm ? ['https://cdn.jsdelivr.net'] : [];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    // 'wasm-unsafe-eval' and blob: are only granted on the CMS, which runs
    // ffmpeg.wasm to trim video in the browser: the library instantiates
    // WebAssembly and spawns its worker from a blob URL. The public site never
    // needs either, so it keeps the tighter policy.
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(allowWasm ? ["'wasm-unsafe-eval'", 'blob:'] : []),
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'blob:', ...supabase],
    'connect-src': ["'self'", ...supabase, ...ffmpegCdn, ...(isDev ? ['ws:'] : [])],
    'media-src': ["'self'", 'blob:', ...supabase],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
  };

  // Only meaningful when the site is actually served over TLS. On an http
  // origin it rewrites same-origin Server Action POSTs to https://, which then
  // fail with ERR_SSL_PROTOCOL_ERROR — that breaks sign-in, TOTP enrolment and
  // every CMS form when running locally or over plain http.
  if (clientEnv.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    directives['upgrade-insecure-requests'] = [];
  }

  const header = Object.entries(directives)
    .map(([key, val]) => (val.length ? `${key} ${val.join(' ')}` : key))
    .join('; ');

  return { header };
}
