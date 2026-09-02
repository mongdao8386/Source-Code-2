import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Fraunces, Inter } from 'next/font/google';
import { routing, type Locale } from '@/i18n/routing';
import { clientEnv } from '@/lib/env';
import { getSiteSettings } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import '../globals.css';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-fraunces',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Draw into the notch/Dynamic Island area. Without this iOS keeps the page
  // inside the safe area and env(safe-area-inset-*) always resolves to 0, so
  // none of the padding below would ever apply.
  viewportFit: 'cover',
  themeColor: '#08080a',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const name = settings.brand_name || 'Studio';
  return {
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: `${name} — Model booking`, template: `%s · ${name}` },
    description: 'Tuyển chọn gái đi khách chuyên nghiệp.',
    robots: { index: true, follow: true },
    icons: settings.favicon_path
      ? { icon: publicPhotoUrl(settings.favicon_path) }
      : undefined,
    openGraph: settings.og_image_path
      ? { images: [publicPhotoUrl(settings.og_image_path)] }
      : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const [messages, settings] = await Promise.all([getMessages(), getSiteSettings()]);

  // The CHECK constraint on accent_color guarantees a bare hex literal, so
  // there is nothing here that could escape the declaration.
  const accent = /^#[0-9a-fA-F]{6}$/.test(settings.accent_color)
    ? settings.accent_color
    : '#c8a253';

  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable}`}
      style={{ '--color-gold': accent } as React.CSSProperties}
    >
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
