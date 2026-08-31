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
    <Container className="pt-32">
      <header className="border-b border-line pb-8">
        <h1 className="text-display text-bone">{tr('title')}</h1>
        <p className="mt-3 max-w-md text-sm text-bone-dim">{tr('subtitle')}</p>
      </header>

      {/* filters */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <FilterChip href={{ pathname: '/models' }} active={!category}>
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
        {cities.length > 0 && <span className="mx-2 h-4 w-px bg-line-strong" />}
        {cities.map((ci) => (
          <FilterChip
            key={ci}
            href={{ pathname: '/models', query: { city: ci } }}
            active={city === ci}
          >
            {ci}
          </FilterChip>
        ))}
      </div>

      {models.length ? (
        <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {models.map((m, i) => (
            <Reveal as="li" key={m.id} delay={(i % 4) * 60}>
              <ModelCard model={m} locale={locale} priority={i < 4} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <p className="mt-20 text-sm text-bone-dim">{tr('empty')}</p>
      )}
    </Container>
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
        'border px-4 py-2 text-[0.6875rem] uppercase tracking-[0.18em] transition-colors',
        active
          ? 'border-gold text-gold'
          : 'border-line-strong text-bone-dim hover:border-bone hover:text-bone',
      )}
    >
      {children}
    </Link>
  );
}
