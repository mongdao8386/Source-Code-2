export const revalidate = 300;

import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
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
  const headline = tField(settings.hero, 'headline', locale) || 'Studio';
  return { title: headline };
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
    getPublishedModels({ limit: 6 }),
    getCategories(),
    getPublishedTestimonials(),
  ]);

  const heroImage = tField(settings.hero, 'image', locale);
  const headline = tField(settings.hero, 'headline', locale);
  const sub = tField(settings.hero, 'sub', locale);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[86vh] items-end overflow-hidden">
        {heroImage ? (
          <Image
            src={publicPhotoUrl(heroImage)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_10%,#1c1c1f_0%,#0a0a0b_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

        <Container className="relative pb-16 pt-40">
          <p className="kicker">{tr('eyebrow')}</p>
          <h1 className="mt-5 max-w-[16ch] text-hero text-bone">{headline}</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-bone-dim">{sub}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <BookingButton telegramUrl={settings.telegram_channel_url} label={tr('ctaButton')} />
            <Link
              href="/models"
              className="text-xs uppercase tracking-[0.2em] text-bone-dim underline-offset-8 hover:text-bone hover:underline"
            >
              {tr('featuredMore')}
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Featured models ──────────────────────────────────── */}
      <Container as="section" className="mt-28">
        <div className="flex items-end justify-between border-b border-line pb-5">
          <h2 className="text-display text-bone">{tr('featuredTitle')}</h2>
          <Link
            href="/models"
            className="text-xs uppercase tracking-[0.2em] text-bone-dim hover:text-gold"
          >
            {tr('featuredMore')}
          </Link>
        </div>

        {models.length ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:gap-x-10">
            {models.map((m, i) => (
              <Reveal as="li" key={m.id} delay={(i % 3) * 80}>
                {/* offset every 2nd column for an asymmetric rhythm */}
                <div className={i % 3 === 1 ? 'md:mt-16' : undefined}>
                  <ModelCard model={m} locale={locale} priority={i < 3} />
                </div>
              </Reveal>
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-sm text-bone-dim">—</p>
        )}
      </Container>

      {/* ── Categories ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <Container as="section" className="mt-32">
          <h2 className="text-display text-bone">{tr('categoriesTitle')}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={{ pathname: '/models', query: { category: c.slug } }}
                className="border border-line-strong px-5 py-2 text-xs uppercase tracking-[0.18em] text-bone-dim transition-colors hover:border-gold hover:text-gold"
              >
                {t(c.name, locale)}
              </Link>
            ))}
          </div>
        </Container>
      )}

      {/* ── Testimonials ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <Container as="section" className="mt-32">
          <h2 className="text-display text-bone">{tr('testimonialsTitle')}</h2>
          <ul className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((q) => (
              <Reveal as="li" key={q.id}>
                <blockquote className="border-l border-gold pl-6">
                  <p className="font-display text-lg leading-snug text-bone">
                    “{t(q.quote, locale)}”
                  </p>
                  <footer className="mt-4 text-xs uppercase tracking-[0.18em] text-bone-dim">
                    {q.author}
                    {q.role ? ` · ${q.role}` : ''}
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </ul>
        </Container>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <Container as="section" className="mt-32">
        <div className="border border-line-strong px-8 py-20 text-center">
          <h2 className="mx-auto max-w-[18ch] text-display text-bone">{tr('ctaTitle')}</h2>
          <p className="mx-auto mt-5 max-w-md text-sm text-bone-dim">{tr('ctaBody')}</p>
          <div className="mt-9 flex justify-center">
            <BookingButton telegramUrl={settings.telegram_channel_url} label={tr('ctaButton')} />
          </div>
        </div>
      </Container>
    </>
  );
}
