import type { MetadataRoute } from 'next';
import { clientEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The CMS path is deliberately absent. robots.txt is public, so listing
        // it would hand the "unguessable" path to anyone who asks for the file
        // — the opposite of what naming it obscurely is for. Crawlers are kept
        // out by the `X-Robots-Tag: noindex, nofollow` that middleware sets on
        // every CMS response, which says the same thing without disclosing it.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
