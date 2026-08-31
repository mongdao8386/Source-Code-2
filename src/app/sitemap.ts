import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { clientEnv } from '@/lib/env';
import { getPublishedModels } from '@/lib/queries/public';

const STATIC_PATHS = ['', '/models', '/about', '/guide', '/terms'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL;
  const models = await getPublishedModels().catch(() => []);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${base}/${locale}${path}`,
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : 0.6,
      });
    }
    for (const m of models) {
      entries.push({
        url: `${base}/${locale}/models/${m.slug}`,
        lastModified: m.updated_at,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
