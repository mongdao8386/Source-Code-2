import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { clientEnv } from '@/lib/env';
import { getPublishedModels } from '@/lib/queries/public';

// Canonical route keys; getPathname turns each into the locale's own slug
// (/vi/nguoi-mau, /en/models), which is what the page actually answers on.
const STATIC_PATHS = ['/', '/models', '/about', '/guide', '/terms'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL;
  const models = await getPublishedModels().catch(() => []);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${base}${getPathname({ locale, href: path })}`,
        changeFrequency: path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : 0.6,
      });
    }
    for (const m of models) {
      entries.push({
        url: `${base}${getPathname({
          locale,
          href: { pathname: '/models/[slug]', params: { slug: m.slug } },
        })}`,
        lastModified: m.updated_at,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
