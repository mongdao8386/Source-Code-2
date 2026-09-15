export const revalidate = 300;

import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
import { Marquee } from '@/components/site/Marquee';
import { FeedbackCard } from '@/components/site/FeedbackCard';
import { ModelCard } from '@/components/site/ModelCard';
import { ModelTicker } from '@/components/site/ModelTicker';
import { HeroStack } from '@/components/site/HeroStack';
import { BookingButton } from '@/components/site/BookingButton';
import { SupportContacts } from '@/components/site/SupportContacts';
import { TelegramIcon } from '@/components/site/TelegramIcon';
import {
  getCategories,
  getPublishedModels,
  getPublishedFeedback,
  getSiteSettings,
} from '@/lib/queries/public';
import { t, tField, tPlain } from '@/lib/i18n-text';
import { modelMeasure, modelPrice } from '@/lib/model-facts';
import { publicPhotoUrl } from '@/lib/storage';
import { supportContacts } from '@/lib/telegram';

/** How many portraits the featured board shows: one lead plus a grid. */
const FEATURED = 9;

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

  // The whole catalogue rather than the first eight: the hero counts it and
  // the ticker runs through all of it. One query either way — the board just
  // slices what it needs.
  const [tr, trm, tf, settings, models, categories, testimonials] = await Promise.all([
    getTranslations('home'),
    getTranslations('models'),
    getTranslations('feedback'),
    getSiteSettings(),
    getPublishedModels(),
    getCategories(),
    getPublishedFeedback({ limit: 3 }),
  ]);

  // hero.image is a bare storage path, not a { vi, en } bag.
  const heroImage = tPlain(settings.hero, 'image');
  const headline = tField(settings.hero, 'headline', locale);
  const sub = tField(settings.hero, 'sub', locale);
  const telegram = settings.telegram_channel_url;
  const contacts = supportContacts(settings);

  const catName = (id: string) => {
    const c = categories.find((x) => x.id === id);
    return c ? t(c.name, locale) : '';
  };
  const tagOf = (m: (typeof models)[number]) => catName(m.category_ids[0] ?? '') || undefined;

  const featured = models.slice(0, FEATURED);
  const lead = featured[0];

  // Caption for the lead portrait. The column beside it is 1fr against a very
  // tall image, so a name and an ordinal left most of it empty. These are the
  // same facts the profile page opens with — enough to make the space earn
  // itself without turning the board into a spec sheet.
  const leadBio = lead ? t(lead.bio, locale) : '';
  const leadPrice = lead ? modelPrice(lead.details, locale) : '';
  const leadSpec: Array<[string, string]> = [];
  if (lead) {
    if (lead.height_cm) leadSpec.push([trm('height'), `${lead.height_cm} cm`]);
    const measure = modelMeasure(lead.measurements);
    if (measure) leadSpec.push([trm('measurements'), measure]);
    if (lead.city) leadSpec.push([trm('city'), lead.city]);
    if (lead.experience_years != null) {
      leadSpec.push([trm('experience'), `${lead.experience_years} ${trm('years')}`]);
    }
  }

  const stats: string[] = [];
  if (models.length) stats.push(`${models.length} ${tr('statModels')}`);
  if (categories.length) stats.push(`${categories.length} ${tr('statCategories')}`);
  if (contacts.length) stats.push(tr('statSupport'));

  const steps = [1, 2, 3].map((n) => ({
    n,
    title: tr(`step${n}Title` as 'step1Title'),
    body: tr(`step${n}Body` as 'step1Body'),
  }));

  const trust = [1, 2, 3, 4].map((n) => ({
    n,
    title: tr(`trust${n}Title` as 'trust1Title'),
    body: tr(`trust${n}Body` as 'trust1Body'),
  }));

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/30 to-transparent" />
          </>
        ) : (
          <div className="aurora absolute inset-0" />
        )}

        <Container className="relative grid min-h-[92svh] items-center gap-12 pb-16 pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-36">
          <div>
            <Reveal>
              <p className="kicker flex items-center gap-3 text-gold">
                <span aria-hidden className="h-px w-8 bg-gold" />
                {tr('eyebrow')}
              </p>
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
              className="mt-7 max-w-[13ch] text-balance text-[clamp(3rem,7.2vw,7.25rem)] leading-[0.9] tracking-[-0.04em] text-bone"
            >
              {headline}
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 max-w-md text-base leading-relaxed text-bone-dim">{sub}</p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex flex-wrap items-center gap-6">
                <BookingButton telegramUrl={telegram} label={tr('ctaButton')} />
                <Link
                  href="/models"
                  className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-bone"
                >
                  {tr('featuredMore')} &#8599;
                </Link>
              </div>
            </Reveal>

            {stats.length > 0 && (
              <Reveal delay={400}>
                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6">
                  {stats.map((s) => (
                    <li
                      key={s}
                      className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.2em] text-bone-faint"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-gold" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>

          <Reveal delay={250} className="lg:pl-6">
            <HeroStack models={models} locale={locale} note={tr('heroNote')} />
          </Reveal>
        </Container>
      </section>

      {/* ── Promise strip ────────────────────────────────────── */}
      <section className="border-y border-line bg-surface-1/30">
        <Container className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((it, i) => (
            <div
              key={it.n}
              className={
                'flex gap-4 py-6 lg:py-8 ' +
                (i > 0 ? 'border-t border-line sm:border-t-0 lg:border-l lg:pl-8 ' : '') +
                (i === 1 ? 'sm:border-l sm:pl-8 ' : '') +
                (i === 2 ? 'sm:border-t ' : '') +
                (i === 3 ? 'sm:border-l sm:border-t sm:pl-8 lg:border-t-0 ' : '') +
                (i < 3 ? 'lg:pr-8' : '')
              }
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/40 text-gold">
                <TrustIcon n={it.n} />
              </span>
              <div>
                <p className="text-sm font-medium text-bone">{it.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-bone-dim">{it.body}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* ── Ticker ───────────────────────────────────────────── */}
      {categories.length > 0 && (
        <Marquee items={categories.map((c) => t(c.name, locale))} />
      )}

      {/* ── Featured board ───────────────────────────────────── */}
      <Container as="section" className="mt-24 md:mt-32">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="kicker text-gold">01</p>
            <h2 className="mt-3 text-section text-bone">{tr('featuredTitle')}</h2>
          </div>
          <Link
            href="/models"
            className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-gold"
          >
            {tr('featuredMore')} &#8599;
          </Link>
        </div>

        {featured.length ? (
          <>
            {/* Lead portrait, oversized — the scale break the grid needs. */}
            {lead && (
              <Reveal className="mt-12 grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-end">
                <div className="glow-gold">
                  <ModelCard model={lead} locale={locale} index={0} priority tag={tagOf(lead)} />
                </div>
                <div className="pb-6">
                  <p className="ordinal">01 / {String(models.length).padStart(2, '0')}</p>
                  <Link
                    href={{ pathname: '/models/[slug]', params: { slug: lead.slug } }}
                    className="mt-4 block font-display text-4xl leading-tight text-bone transition-colors hover:text-gold"
                  >
                    {lead.stage_name}
                  </Link>

                  {leadPrice && (
                    <p className="mt-3 flex items-baseline gap-2">
                      <span className="kicker">{trm('price')}</span>
                      <span className="font-display text-2xl text-gold">{leadPrice}</span>
                    </p>
                  )}

                  {leadBio && (
                    <p className="mt-5 line-clamp-4 max-w-[42ch] whitespace-pre-line text-sm leading-relaxed text-bone-dim">
                      {leadBio}
                    </p>
                  )}

                  {leadSpec.length > 0 && (
                    <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6">
                      {leadSpec.map(([label, value]) => (
                        <div key={label}>
                          <dt className="kicker">{label}</dt>
                          <dd className="mt-1.5 text-sm text-bone">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <BookingButton telegramUrl={telegram} modelId={lead.id} size="md" />
                    <Link
                      href={{ pathname: '/models/[slug]', params: { slug: lead.slug } }}
                      className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-bone"
                    >
                      {trm('viewProfile')} &#8599;
                    </Link>
                  </div>
                </div>
              </Reveal>
            )}

            <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {featured.slice(1).map((m, i) => (
                <Reveal as="li" key={m.id} delay={(i % 4) * 70}>
                  <ModelCard model={m} locale={locale} index={i + 1} priority={i < 3} tag={tagOf(m)} />
                </Reveal>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-14 text-sm text-bone-faint">&#8212;</p>
        )}
      </Container>

      {/* ── Faces on a loop ──────────────────────────────────── */}
      <ModelTicker models={models} locale={locale} />

      {/* ── How booking works ────────────────────────────────── */}
      <Container as="section" className="mt-28 md:mt-40">
        <p className="kicker text-gold">02</p>
        <h2 className="mt-3 text-section text-bone">{tr('stepsTitle')}</h2>
        <ol className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 90} className="relative bg-ink p-7 md:p-9">
              <span className="font-display text-5xl leading-none text-gold/25 md:text-6xl">
                0{s.n}
              </span>
              <h3 className="mt-6 font-display text-2xl text-bone">{s.title}</h3>
              <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-bone-dim">{s.body}</p>
              {s.n === 2 && (
                <TelegramIcon size={18} className="absolute right-7 top-7 text-gold/60 md:right-9 md:top-9" />
              )}
            </Reveal>
          ))}
        </ol>
      </Container>

      {/* ── Categories as an oversized list ──────────────────── */}
      {categories.length > 0 && (
        <Container as="section" className="mt-28 md:mt-40">
          <p className="kicker text-gold">03</p>
          <h2 className="mt-3 text-section text-bone">{tr('categoriesTitle')}</h2>
          <ul className="mt-10 border-t border-line">
            {categories.map((c, i) => {
              const count = models.filter((m) => m.category_ids.includes(c.id)).length;
              return (
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
                    {count > 0 && (
                      <span className="ordinal ml-4 hidden sm:inline">
                        {String(count).padStart(2, '0')} {tr('statModels')}
                      </span>
                    )}
                    <span className="ordinal ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                      &#8599;
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      )}

      {/* ── Feedback ─────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <Container as="section" className="mt-28 md:mt-40">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker text-gold">04</p>
              <h2 className="mt-3 text-section text-bone">{tr('testimonialsTitle')}</h2>
            </div>
            <Link
              href="/feedback"
              className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-gold"
            >
              {tf('all')} &#8599;
            </Link>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((q, i) => (
              <Reveal as="li" key={q.id} delay={(i % 3) * 90}>
                <FeedbackCard item={q} locale={locale} aboutLabel={tf('forModel')} />
              </Reveal>
            ))}
          </ul>
        </Container>
      )}

      {/* ── Closing CTA + the two channels ───────────────────── */}
      <section className="relative mt-28 overflow-hidden border-y border-line py-28 md:mt-40 md:py-40">
        <div className="aurora absolute inset-0 opacity-60" />
        <Container className="relative">
          <div className="text-center">
            <Reveal className="glow-gold inline-block">
              <h2 className="mx-auto max-w-[16ch] text-balance text-hero leading-[0.9] tracking-[-0.04em] text-bone">
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
                <BookingButton telegramUrl={telegram} label={tr('ctaButton')} />
              </div>
            </Reveal>
          </div>

          {contacts.length > 0 && (
            <Reveal delay={350} className="mx-auto mt-16 max-w-3xl">
              <SupportContacts contacts={contacts} variant="cards" />
            </Reveal>
          )}
        </Container>
      </section>
    </>
  );
}

/** Line icons for the promise strip: profile, Telegram, discretion, speed. */
function TrustIcon({ n }: { n: number }) {
  if (n === 2) return <TelegramIcon size={16} />;
  const d =
    n === 1
      ? 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-3.5 9.2 2.4 2.4 4.6-5'
      : n === 3
        ? 'M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z'
        : 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3.2 2';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
