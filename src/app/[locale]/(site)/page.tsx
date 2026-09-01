export const revalidate = 300;

import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
import { Marquee } from '@/components/site/Marquee';
import { Stars } from '@/components/site/Stars';
import { ModelCard } from '@/components/site/ModelCard';
import { BookingButton } from '@/components/site/BookingButton';
import {
  getCategories,
  getPublishedModels,
  getPublishedTestimonials,
  getSiteSettings,
} from '@/lib/queries/public';
import { t, tField } from '@/lib/i18n-text';
import { publicPhotoUrl } from '@/lib/storage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const headline = tField(settings.hero, 'headline', locale);
  return headline ? { title: headline } : {};
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tr, settings, models, categories, testimonials] = await Promise.all([
    getTranslations('home'),
    getSiteSettings(),
    getPublishedModels({ limit: 8 }),
    getCategories(),
    getPublishedTestimonials(),
  ]);

  const heroImage = tField(settings.hero, 'image', locale);
  const headline = tField(settings.hero, 'headline', locale);
  const sub = tField(settings.hero, 'sub', locale);
  const lead = models[0];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden">
        {heroImage ? (
          <>
            <Image
              src={publicPhotoUrl(heroImage)}
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-105 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
          </>
        ) : (
          <div className="aurora absolute inset-0" />
        )}

        <Container className="relative pb-14 pt-40">
          <Reveal>
            <p className="kicker text-gold">{tr('eyebrow')}</p>
          </Reveal>

          {/* One mask for the whole headline. Masking per word would put each
              word on its own line — .line-mask is display:block — which turned
              a 7-word Vietnamese headline into a 7-line, 1000px-tall wall. */}
          {/* The type styles must sit on the same element as max-w: `ch` is
              relative to that element's own font-size, so a 15ch cap on an
              unsized h1 resolves against 16px and shreds the headline. */}
          <Reveal
            as="h1"
            variant="mask"
            className="mt-7 max-w-[15ch] text-mega leading-[0.86] tracking-[-0.045em] text-bone"
          >
            {headline}
          </Reveal>

          <div className="mt-10 flex flex-col gap-8 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
            <Reveal delay={200}>
              <p className="max-w-sm text-sm leading-relaxed text-bone-dim">{sub}</p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-wrap items-center gap-6">
                <BookingButton
                  telegramUrl={settings.telegram_channel_url}
                  label={tr('ctaButton')}
                />
                <Link
                  href="/models"
                  className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-bone"
                >
                  {tr('featuredMore')}
                </Link>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Ticker ───────────────────────────────────────────── */}
      {categories.length > 0 && (
        <Marquee items={categories.map((c) => t(c.name, locale))} />
      )}

      {/* ── Featured board ───────────────────────────────────── */}
      <Container as="section" className="mt-24 md:mt-32">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <h2 className="text-section text-bone">{tr('featuredTitle')}</h2>
          <Link
            href="/models"
            className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-gold"
          >
            {tr('featuredMore')} &#8599;
          </Link>
        </div>

        {models.length ? (
          <>
            {/* Lead portrait, oversized — the scale break the grid needs. */}
            {lead && (
              <Reveal className="mt-12 grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-end">
                <ModelCard model={lead} locale={locale} index={0} priority />
                <div className="pb-6">
                  <p className="ordinal">01 / {String(models.length).padStart(2, '0')}</p>
                  <p className="mt-4 font-display text-3xl leading-tight text-bone">
                    {lead.stage_name}
                  </p>
                  {lead.city && <p className="kicker mt-3">{lead.city}</p>}
                </div>
              </Reveal>
            )}

            <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {models.slice(1).map((m, i) => (
                <Reveal as="li" key={m.id} delay={(i % 4) * 70}>
                  <ModelCard model={m} locale={locale} index={i + 1} priority={i < 3} />
                </Reveal>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-14 text-sm text-bone-faint">&#8212;</p>
        )}
      </Container>

      {/* ── Categories as an oversized list ──────────────────── */}
      {categories.length > 0 && (
        <Container as="section" className="mt-28 md:mt-40">
          <p className="kicker">{tr('categoriesTitle')}</p>
          <ul className="mt-8 border-t border-line">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={{ pathname: '/models', query: { category: c.slug } }}
                  className="group flex items-baseline gap-5 border-b border-line py-5 transition-colors hover:bg-surface-1/40 md:py-7"
                >
                  <span className="ordinal w-8 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-3xl text-bone transition-all duration-500 ease-lux group-hover:translate-x-3 group-hover:text-gold md:text-5xl">
                    {t(c.name, locale)}
                  </span>
                  <span className="ordinal ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                    &#8599;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {/* ── Testimonials ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <Container as="section" className="mt-28 md:mt-40">
          <p className="kicker">{tr('testimonialsTitle')}</p>
          <ul className="mt-10 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((q, i) => (
              <Reveal as="li" key={q.id} delay={(i % 3) * 90}>
                <blockquote>
                  <Stars rating={q.rating} />
                  <span aria-hidden className="font-display text-5xl leading-none text-gold">
                    &ldquo;
                  </span>
                  <p className="mt-1 font-display text-xl leading-snug text-bone">
                    {t(q.quote, locale)}
                  </p>
                  <footer className="kicker mt-5 border-t border-line pt-3">
                    {q.author}
                    {q.role ? ` — ${q.role}` : ''}
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </ul>
        </Container>
      )}

      {/* ── Closing CTA ──────────────────────────────────────── */}
      <section className="relative mt-28 overflow-hidden border-y border-line py-28 md:mt-40 md:py-40">
        <div className="aurora absolute inset-0 opacity-60" />
        <Container className="relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-[16ch] text-hero leading-[0.9] tracking-[-0.04em] text-bone">
              {tr('ctaTitle')}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-bone-dim">
              {tr('ctaBody')}
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-10 flex justify-center">
              <BookingButton
                telegramUrl={settings.telegram_channel_url}
                label={tr('ctaButton')}
              />
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
