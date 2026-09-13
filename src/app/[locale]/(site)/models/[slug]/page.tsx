export const revalidate = 300;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Gallery } from '@/components/site/Gallery';
import { ModelVideo } from '@/components/site/ModelVideo';
import { ModelCard, isNewModel } from '@/components/site/ModelCard';
import { BookingButton } from '@/components/site/BookingButton';
import { SupportContacts } from '@/components/site/SupportContacts';
import { Reveal } from '@/components/site/Reveal';
import {
  getCategories,
  getModelBySlug,
  getPublishedModels,
  getSiteSettings,
} from '@/lib/queries/public';
import { t, tField } from '@/lib/i18n-text';
import { modelMeasure, modelPrice } from '@/lib/model-facts';
import { clientEnv } from '@/lib/env';
import { supportContacts } from '@/lib/telegram';

/** How many other profiles the foot of the page suggests. */
const RELATED = 4;

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

  const [model, settings, tr, all, categories] = await Promise.all([
    getModelBySlug(slug),
    getSiteSettings(),
    getTranslations('models'),
    getPublishedModels(),
    getCategories(),
  ]);

  if (!model) notFound();

  const telegram = settings.telegram_channel_url;
  const contacts = supportContacts(settings);
  const bio = t(model.bio, locale);
  const m = (model.measurements ?? {}) as Record<string, string | number>;
  const price = modelPrice(model.details, locale);
  const measure = modelMeasure(model.measurements);

  const catName = (id: string) => {
    const c = categories.find((x) => x.id === id);
    return c ? t(c.name, locale) : '';
  };
  const tags = categories
    .filter((c) => model.category_ids.includes(c.id))
    .map((c) => ({ slug: c.slug, name: t(c.name, locale) }));

  // The headline facts, in the order a visitor asks about them.
  const facts: Array<[string, string]> = [];
  if (model.height_cm) facts.push([tr('height'), `${model.height_cm} cm`]);
  if (measure) facts.push([tr('measurements'), measure]);
  if (model.city) facts.push([tr('city'), model.city]);

  // The full sheet in the sidebar: everything above, then the rest.
  const spec: Array<[string, string]> = [...facts];
  if (m.shoe) spec.push([tr('shoe'), String(m.shoe)]);
  if (m.hair) spec.push([tr('hair'), String(m.hair)]);
  if (m.eyes) spec.push([tr('eyes'), String(m.eyes)]);
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

  // Other profiles: those sharing a category first, then whatever is left,
  // in board order — never the one on screen.
  const others = all.filter((o) => o.id !== model.id);
  const shared = others.filter((o) => o.category_ids.some((id) => model.category_ids.includes(id)));
  const related = [...shared, ...others.filter((o) => !shared.includes(o))].slice(0, RELATED);

  return (
    <>
      {/* Name banner — the scale break that opens the page. */}
      <Container className="pt-32 md:pt-40">
        <div className="flex flex-wrap items-center gap-3">
          <p className="kicker flex items-center gap-3 text-gold">
            <span aria-hidden className="h-px w-8 bg-gold" />
            {tr('title')}
          </p>
          {isNewModel(model.published_at) && (
            <span className="bg-gold px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ink">
              {tr('new')}
            </span>
          )}
        </div>
        <h1 className="mt-5 text-balance text-hero leading-[0.86] tracking-[-0.045em] text-bone">
          {model.stage_name}
        </h1>

        {/* Quick facts: price first, in gold. */}
        {(price || facts.length > 0) && (
          <div className="mt-8 flex flex-wrap items-stretch gap-3">
            {price && (
              <span className="btn-gold inline-flex h-11 items-center gap-3 px-4 text-ink">
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] opacity-70">
                  {tr('price')}
                </span>
                <span className="font-display text-xl leading-none">{price}</span>
              </span>
            )}
            {facts.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex h-11 items-center gap-3 border border-line-strong px-4"
              >
                <span className="kicker text-[0.6rem]">{k}</span>
                <span className="text-sm text-bone">{v}</span>
              </span>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-2">
            {tags.map((c) => (
              <li key={c.slug}>
                <Link
                  href={{ pathname: '/models', query: { category: c.slug } }}
                  className="tap-safe inline-flex items-center gap-2 px-1 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-gold/90 transition-colors hover:text-gold"
                >
                  <span aria-hidden className="h-px w-3 bg-gold/60" />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>

      <Container className="mt-12 grid gap-12 lg:grid-cols-[1fr_21rem] lg:gap-14">
        <div className="order-2 lg:order-1">
          <Gallery photos={model.photos} locale={locale} name={model.stage_name} />
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <div className="relative border border-line bg-surface-1/30 p-5 lg:p-6">
            {/* Gold hairline across the top, like a spine on a folder. */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

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
                  <dd className="text-right text-sm tabular-nums text-bone">{v}</dd>
                </div>
              ))}
            </dl>

            {/* pre-line, not a plain <p>: the CMS field is a textarea, so the line
                breaks someone typed there are the formatting they meant. HTML
                would otherwise collapse every one of them into a space and run
                the whole bio together as a single block. */}
            {bio ? (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-bone-dim">
                {bio}
              </p>
            ) : null}

            <div className="mt-7 hidden lg:block">
              <div className="glow-gold">
                <BookingButton telegramUrl={telegram} modelId={model.id} className="w-full" />
              </div>
              {contacts.length > 0 && (
                <SupportContacts contacts={contacts} variant="list" modelId={model.id} className="mt-6" />
              )}
            </div>
          </div>
        </aside>
      </Container>

      {/* ── Other profiles ───────────────────────────────────── */}
      {related.length > 0 && (
        <Container as="section" className="mt-28 md:mt-36">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <h2 className="text-section text-bone">{tr('more')}</h2>
            <Link
              href="/models"
              className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-gold"
            >
              {tr('filterAll')} &#8599;
            </Link>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 lg:gap-x-6">
            {related.map((r, i) => (
              <Reveal as="li" key={r.id} delay={(i % 4) * 70}>
                <ModelCard
                  model={r}
                  locale={locale}
                  tag={catName(r.category_ids[0] ?? '') || undefined}
                />
              </Reveal>
            ))}
          </ul>
        </Container>
      )}

      {/* Sticky mobile CTA */}
      {/* The home indicator / gesture bar overlaps anything at bottom:0, and
          this is the site's only conversion action — pad past it. Both
          channels ride along: the second as a compact link, so a blocked or
          silent first channel is one tap away instead of a scroll to the
          footer. */}
      <div className="pad-safe-bottom sticky bottom-0 z-40 border-t border-line bg-ink/90 px-4 pt-3 backdrop-blur-md lg:hidden">
        <div className="pb-3">
          <div className="flex items-center gap-3">
            {price && (
              <span className="shrink-0">
                <span className="kicker block text-[0.55rem]">{tr('price')}</span>
                <span className="font-display text-lg leading-none text-gold">{price}</span>
              </span>
            )}
            <BookingButton telegramUrl={telegram} modelId={model.id} className="flex-1" />
          </div>
          {contacts.length > 0 && (
            <SupportContacts
              contacts={contacts}
              variant="inline"
              modelId={model.id}
              className="mt-2 justify-center"
            />
          )}
        </div>
      </div>
    </>
  );
}
