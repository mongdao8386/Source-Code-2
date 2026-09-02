export const revalidate = 300;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Gallery } from '@/components/site/Gallery';
import { ModelVideo } from '@/components/site/ModelVideo';
import { BookingButton } from '@/components/site/BookingButton';
import { getModelBySlug, getPublishedModels, getSiteSettings } from '@/lib/queries/public';
import { t, tField } from '@/lib/i18n-text';
import { clientEnv } from '@/lib/env';

export async function generateStaticParams() {
  try {
    const models = await getPublishedModels();
    return models.map((m) => ({ slug: m.slug }));
  } catch {
    // Wherever the database is reachable this branch never runs and the whole
    // catalogue is prerendered. When it is not — a Supabase blip while the VPS
    // builds the image, or a build with placeholder credentials — fall back to
    // rendering these pages on demand instead of failing the deploy outright.
    // `revalidate` above still governs them once they exist.
    return [];
  }
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

  const spec: Array<[string, string]> = [];
  if (model.height_cm) spec.push([tr('height'), `${model.height_cm} cm`]);
  const measure = ['bust', 'waist', 'hips'].map((k) => m[k]).filter(Boolean).join(' · ');
  if (measure) spec.push([tr('measurements'), measure]);
  if (m.shoe) spec.push(['Shoe', String(m.shoe)]);
  if (m.hair) spec.push(['Hair', String(m.hair)]);
  if (m.eyes) spec.push(['Eyes', String(m.eyes)]);
  if (model.city) spec.push([tr('city'), model.city]);
  if (model.experience_years != null)
    spec.push([tr('experience'), `${model.experience_years} ${tr('years')}`]);

  // Free-form rows added from the CMS, after the built-in spec and in the order
  // the CMS put them. jsonb, so nothing about the shape is guaranteed: a row is
  // shown only once both halves read as text in this locale.
  for (const row of Array.isArray(model.details) ? model.details : []) {
    const label = t(row?.label, locale);
    const value = t(row?.value, locale);
    if (label && value) spec.push([label, value]);
  }

  return (
    <>
      {/* Name banner — the scale break that opens the page. */}
      <Container className="pt-36 md:pt-44">
        <p className="kicker text-gold">{tr('title')}</p>
        <h1 className="mt-5 text-hero leading-[0.86] tracking-[-0.045em] text-bone">
          {model.stage_name}
        </h1>
      </Container>

      <Container className="mt-14 grid gap-12 lg:grid-cols-[1fr_19rem] lg:gap-16">
        <div className="order-2 lg:order-1">
          <Gallery photos={model.photos} locale={locale} name={model.stage_name} />
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <ModelVideo
            videoPath={model.video_path}
            posterPath={model.video_poster_path}
            name={model.stage_name}
            label={tr('showreel')}
          />

          <dl className="border-t border-line">
            {spec.map(([k, v], i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                <dt className="kicker">{k}</dt>
                <dd className="text-sm tabular-nums text-bone">{v}</dd>
              </div>
            ))}
          </dl>

          {/* pre-line, not a plain <p>: the CMS field is a textarea, so the line
              breaks someone typed there are the formatting they meant. HTML
              would otherwise collapse every one of them into a space and run
              the whole bio together as a single block. */}
          {bio ? (
            <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-bone-dim">
              {bio}
            </p>
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

      {/* Sticky mobile CTA */}
      {/* The home indicator / gesture bar overlaps anything at bottom:0, and
          this is the site's only conversion action — pad past it. */}
      <div className="pad-safe-bottom sticky bottom-0 z-40 border-t border-line bg-ink/90 px-4 pt-4 backdrop-blur-md lg:hidden">
        <div className="pb-4">
          <BookingButton
            telegramUrl={settings.telegram_channel_url}
            modelId={model.id}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}
