export const revalidate = 300;

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/site/Reveal';
import { ModelCard } from '@/components/site/ModelCard';
import { getCategories, getPublishedModels } from '@/lib/queries/public';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

type Filters = { category?: string; city?: string; q?: string };

/** `?q=a&q=b` arrives as an array; take the first rather than crash on it. */
const one = (v: unknown): string | undefined => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s !== '' ? s : undefined;
};

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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const category = one(sp.category);
  const city = one(sp.city);
  const q = one(sp.q)?.trim().slice(0, 60) || undefined;
  setRequestLocale(locale);

  const [tr, categories, models] = await Promise.all([
    getTranslations('models'),
    getCategories(),
    getPublishedModels({ category, city, q }),
  ]);

  const cities = [...new Set(models.map((m) => m.city).filter(Boolean))] as string[];
  const filtered = Boolean(category || city || q);
  const tagOf = (m: (typeof models)[number]) => {
    const c = categories.find((x) => x.id === m.category_ids[0]);
    return c ? t(c.name, locale) : undefined;
  };

  // Chips keep the other filters: picking a city while searching a name
  // narrows the search, it does not throw the search away.
  const keep = (patch: Filters): Filters => {
    const next: Filters = { category, city, q, ...patch };
    return Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined && v !== ''),
    ) as Filters;
  };

  // The search form is a plain GET, so it needs the localised path as a
  // string: `/vi/nguoi-mau`, not the canonical `/models`.
  const action = getPathname({ locale, href: '/models' });

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
      <div className="top-below-header sticky z-30 border-b border-line bg-ink/85 backdrop-blur-md">
        <Container className="flex flex-wrap items-center gap-x-1 gap-y-2 py-3">
          <FilterChip href={{ pathname: '/models', query: keep({ category: undefined, city: undefined }) }} active={!category && !city}>
            {tr('filterAll')}
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              href={{ pathname: '/models', query: keep({ category: c.slug }) }}
              active={category === c.slug}
            >
              {t(c.name, locale)}
            </FilterChip>
          ))}
          {cities.length > 0 && <span className="mx-3 h-3 w-px bg-line-strong" />}
          {cities.map((ci) => (
            <FilterChip
              key={ci}
              href={{ pathname: '/models', query: keep({ city: ci }) }}
              active={city === ci}
            >
              {ci}
            </FilterChip>
          ))}

          <form action={action} method="get" role="search" className="ml-auto flex w-full items-center gap-2 sm:w-auto">
            {category && <input type="hidden" name="category" value={category} />}
            {city && <input type="hidden" name="city" value={city} />}
            <label htmlFor="q" className="sr-only">
              {tr('search')}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={60}
              placeholder={tr('searchPlaceholder')}
              className="h-9 w-full border border-line-strong bg-surface-1 px-3 text-sm text-bone placeholder:text-bone-faint focus:border-gold focus:outline-none sm:w-52"
            />
            <button
              type="submit"
              className="tap-safe h-9 shrink-0 border border-line-strong px-3 text-[0.6875rem] uppercase tracking-[0.2em] text-bone-dim transition-colors hover:border-gold hover:text-gold"
            >
              {tr('searchButton')}
            </button>
          </form>
        </Container>
      </div>

      <Container className="pb-8">
        {filtered && (
          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-bone-faint">
            {q && (
              <span>
                “<span className="text-bone">{q}</span>”
              </span>
            )}
            <Link
              href={{ pathname: '/models' }}
              className="link-wipe uppercase tracking-[0.2em] text-bone-dim hover:text-gold"
            >
              {tr('clear')}
            </Link>
          </p>
        )}

        {models.length ? (
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {models.map((m, i) => (
              <Reveal as="li" key={m.id} delay={(i % 4) * 60}>
                <ModelCard model={m} locale={locale} index={i} priority={i < 4} tag={tagOf(m)} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="mt-24 border-t border-line pt-10">
            <p className="font-display text-3xl text-bone-faint">{tr('empty')}</p>
            {filtered && (
              <Link
                href={{ pathname: '/models' }}
                className="link-wipe mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-bone-dim hover:text-gold"
              >
                {tr('clear')} &#8599;
              </Link>
            )}
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
        'tap-safe px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] transition-colors',
        active ? 'text-gold' : 'text-bone-faint hover:text-bone',
      )}
    >
      {children}
    </Link>
  );
}
