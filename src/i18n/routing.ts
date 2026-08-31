import { defineRouting } from 'next-intl/routing';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

/**
 * Narrows an untrusted value to a known locale.
 *
 * Anything interpolated into a redirect path must go through this. A raw form
 * value such as `\evil.com` turns `/${locale}/admin/login` into
 * `/\evil.com/admin/login`, which browsers resolve as protocol-relative — an
 * off-site redirect out of the app.
 */
export function safeLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Localised path segments: canonical key on the left, per-locale slug on the right.
  pathnames: {
    '/': '/',
    '/models': { vi: '/nguoi-mau', en: '/models' },
    '/models/[slug]': { vi: '/nguoi-mau/[slug]', en: '/models/[slug]' },
    '/about': { vi: '/ve-chung-toi', en: '/about' },
    '/terms': { vi: '/dieu-khoan', en: '/terms' },
    '/guide': { vi: '/huong-dan', en: '/guide' },
  },
});
