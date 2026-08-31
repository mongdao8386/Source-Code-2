export const revalidate = 300;

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
import { ModelCard } from '@/components/site/ModelCard';
import { getCategories, getPublishedModels } from '@/lib/queries/public';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = await getTranslations({ locale, namespace: 'models' });
  return { title: tr('title'), description: tr('subtitle') };
}

export default async function ModelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string; city?: string }>;
}) {
  const { locale } = await params;
  const { category, city } = await searchParams;
  setRequestLocale(locale);

  const [tr, categories, models] = await Promise.all([
    getTranslations('models'),
    getCategories(),
    getPublishedModels({ category, city }),
  ]);

  const cities = [...new Set(models.map((m) => m.city).filter(Boolean))] as string[];

  return (
    <>
      <Container className="pt-36 md:pt-44">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="kicker text-gold">{tr('title')}</p>
            <h1 className="mt-5 max-w-[12ch] text-hero leading-[0.88] tracking-[-0.04em] text-bone">
              {tr('subtitle')}
            </h1>
          </div>
          <p className="ordinal pb-2">
            {String(models.length).padStart(2, '0')} {tr('title')}
          </p>
        </header>
      </Container>

      {/* Filters stay in view while the board scrolls. */}
      <div className="sticky top-16 z-30 border-b border-line bg-ink/85 backdrop-blur-md">
        <Container className="flex flex-wrap items-center gap-x-1 gap-y-2 py-3">
          <FilterChip href={{ pathname: '/models' }} active={!category && !city}>
            {tr('filterAll')}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              href={{ pathname: '/models', query: { category: c.slug } }}
              active={category === c.slug}
            >
              {t(c.name, locale)}
            </FilterChip>
          ))}
          {cities.length > 0 && <span className="mx-3 h-3 w-px bg-line-strong" />}
          {cities.map((ci) => (
            <FilterChip
              key={ci}
              href={{ pathname: '/models', query: { city: ci } }}
              active={city === ci}
            >
              {ci}
            </FilterChip>
          ))}
        </Container>
      </div>

      <Container className="pb-8">
        {models.length ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {models.map((m, i) => (
              <Reveal as="li" key={m.id} delay={(i % 4) * 60}>
                <ModelCard model={m} locale={locale} index={i} priority={i < 4} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="mt-24 border-t border-line pt-10">
            <p className="font-display text-3xl text-bone-faint">{tr('empty')}</p>
          </div>
        )}
      </Container>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: Parameters<typeof Link>[0]['href'];
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] transition-colors',
        active ? 'text-gold' : 'text-bone-faint hover:text-bone',
      )}
    >
      {children}
    </Link>
  );
}
