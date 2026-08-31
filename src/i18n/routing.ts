import { defineRouting } from 'next-intl/routing';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

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
    // Admin area is intentionally NOT localised in the URL beyond the locale prefix.
    '/admin': '/admin',
    '/admin/login': '/admin/login',
    '/admin/mfa': '/admin/mfa',
    '/admin/models': '/admin/models',
    '/admin/models/new': '/admin/models/new',
    '/admin/models/[id]': '/admin/models/[id]',
    '/admin/categories': '/admin/categories',
    '/admin/pages': '/admin/pages',
    '/admin/testimonials': '/admin/testimonials',
    '/admin/settings': '/admin/settings',
    '/admin/users': '/admin/users',
    '/admin/audit': '/admin/audit',
  },
});
