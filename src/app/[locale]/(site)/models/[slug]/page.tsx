export const revalidate = 300;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Gallery } from '@/components/site/Gallery';
import { BookingButton } from '@/components/site/BookingButton';
import { getModelBySlug, getPublishedModels, getSiteSettings } from '@/lib/queries/public';
import { t, tField } from '@/lib/i18n-text';
import { clientEnv } from '@/lib/env';

export async function generateStaticParams() {
  const models = await getPublishedModels();
  return models.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) return {};
  const title = tField(model.seo, 'title', locale) || model.stage_name;
  const description = tField(model.seo, 'description', locale) || t(model.bio, locale);
  return {
    title,
    description,
    alternates: { canonical: `${clientEnv.NEXT_PUBLIC_SITE_URL}/${locale}/models/${slug}` },
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [model, settings, tr] = await Promise.all([
    getModelBySlug(slug),
    getSiteSettings(),
    getTranslations('models'),
  ]);

  if (!model) notFound();

  const bio = t(model.bio, locale);
  const m = (model.measurements ?? {}) as Record<string, string | number>;
  const stats: Array<[string, string]> = [];
  if (model.height_cm) stats.push([tr('height'), `${model.height_cm} cm`]);
  if (model.city) stats.push([tr('city'), model.city]);
  if (model.experience_years != null)
    stats.push([tr('experience'), `${model.experience_years} ${tr('years')}`]);
  const measure = ['bust', 'waist', 'hips']
    .map((k) => m[k])
    .filter(Boolean)
    .join(' · ');
  if (measure) stats.push([tr('measurements'), measure]);

  return (
    <>
      <Container className="grid gap-12 pt-32 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div className="order-2 lg:order-1">
          <Gallery photos={model.photos} locale={locale} name={model.stage_name} />
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <h1 className="font-display text-4xl text-bone">{model.stage_name}</h1>

          <dl className="mt-8 divide-y divide-line border-y border-line">
            {stats.map(([k, v]) => (
              <div key={k} className="flex justify-between py-3 text-sm">
                <dt className="kicker">{k}</dt>
                <dd className="text-bone">{v}</dd>
              </div>
            ))}
          </dl>

          {bio ? (
            <p className="mt-8 text-sm leading-relaxed text-bone-dim">{bio}</p>
          ) : null}

          <div className="mt-8 hidden lg:block">
            <BookingButton
              telegramUrl={settings.telegram_channel_url}
              modelId={model.id}
              className="w-full"
            />
          </div>
        </aside>
      </Container>

      {/* sticky mobile CTA */}
      <div className="sticky bottom-0 z-40 border-t border-line bg-ink/90 p-4 backdrop-blur-md lg:hidden">
        <BookingButton
          telegramUrl={settings.telegram_channel_url}
          modelId={model.id}
          className="w-full"
        />
      </div>
    </>
  );
}
