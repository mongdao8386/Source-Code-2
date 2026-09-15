export const revalidate = 300;

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
import { FeedbackCard } from '@/components/site/FeedbackCard';
import { BookingButton } from '@/components/site/BookingButton';
import { getPublishedFeedback, getSiteSettings } from '@/lib/queries/public';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = await getTranslations({ locale, namespace: 'feedback' });
  return { title: tr('title'), description: tr('subtitle') };
}

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tr, th, items, settings] = await Promise.all([
    getTranslations('feedback'),
    getTranslations('home'),
    getPublishedFeedback(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Container className="pt-32 md:pt-40">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="kicker flex items-center gap-3 text-gold">
              <span aria-hidden className="h-px w-8 bg-gold" />
              {tr('title')}
            </p>
            <h1 className="mt-5 max-w-[14ch] text-balance text-hero leading-[0.88] tracking-[-0.04em] text-bone">
              {tr('subtitle')}
            </h1>
          </div>
          <p className="ordinal pb-2">{tr('count', { count: items.length })}</p>
        </header>
      </Container>

      <Container className="pb-8">
        {items.length ? (
          <div className="mt-12 gap-6 md:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={(i % 2) * 80}>
                <FeedbackCard item={item} locale={locale} aboutLabel={tr('forModel')} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-24 border-t border-line pt-10">
            <p className="font-display text-3xl text-bone-faint">{tr('empty')}</p>
          </div>
        )}

        <div className="mt-20 flex flex-wrap items-center gap-6 border-t border-line pt-10">
          <BookingButton telegramUrl={settings.telegram_channel_url} label={th('ctaButton')} />
          <Link
            href="/models"
            className="link-wipe text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-bone"
          >
            {th('featuredMore')} &#8599;
          </Link>
        </div>
      </Container>
    </>
  );
}
