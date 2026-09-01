import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen';
import { getSiteSettings } from '@/lib/queries/public';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();

  if (settings.maintenance_mode) {
    return <MaintenanceScreen brandName={settings.brand_name} />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* The header is fixed so the hero runs full-bleed under it; every page
          therefore carries its own top padding rather than relying on flow. */}
      <AnnouncementBar settings={settings} />
      <SiteHeader
        telegramUrl={settings.telegram_channel_url}
        brandName={settings.brand_name}
        logoPath={settings.logo_path}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
