export const revalidate = 300;

import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { ContentPage, contentMetadata } from '@/components/site/ContentPage';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return contentMetadata('guide', locale);
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  return <ContentPage slug="guide" locale={locale} />;
}
