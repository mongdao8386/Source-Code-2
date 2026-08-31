import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/site/Prose';
import { getPage } from '@/lib/queries/public';
import { t, tField } from '@/lib/i18n-text';

export async function contentMetadata(
  slug: string,
  locale: Locale,
): Promise<Metadata> {
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: tField(page.seo, 'title', locale) || t(page.title, locale),
    description: tField(page.seo, 'description', locale) || undefined,
  };
}

export async function ContentPage({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  setRequestLocale(locale);
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <Container className="pt-32">
      <h1 className="text-display text-bone">{t(page.title, locale)}</h1>
      <div className="mt-10">
        <Prose markdown={t(page.body, locale)} />
      </div>
    </Container>
  );
}
