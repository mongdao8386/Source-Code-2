import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Fraunces, Inter } from 'next/font/google';
import { CMS_LOCALE } from '@/lib/admin-path';
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

export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Root layout for the CMS. It sits outside app/[locale], so it owns its own
 * <html>/<body> and pins a single interface language — the console is only ever
 * used by staff, and keeping it out of the locale tree is what allows the
 * public path to be configurable (see @/lib/admin-path).
 */
export default async function ConsoleRootLayout({ children }: { children: ReactNode }) {
  setRequestLocale(CMS_LOCALE);
  const messages = await getMessages({ locale: CMS_LOCALE });

  return (
    <html lang={CMS_LOCALE} className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-ink text-bone">
        <NextIntlClientProvider locale={CMS_LOCALE} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
