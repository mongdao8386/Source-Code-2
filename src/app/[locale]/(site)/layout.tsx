import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen';
import { SupportFab } from '@/components/site/SupportFab';
import { SiteProtection } from '@/components/site/SiteProtection';
import { BackToTop } from '@/components/site/BackToTop';
import { readProtection } from '@/lib/protection';
import { getSiteSettings } from '@/lib/queries/public';
import { supportContacts } from '@/lib/telegram';

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

  const contacts = supportContacts(settings);
  const protection = readProtection(settings.protection);
  const nav = await getTranslations('nav');

  return (
    <div className="flex min-h-dvh flex-col">
      {/* The header is fixed so the hero runs full-bleed under it; every page
          therefore carries its own top padding rather than relying on flow. */}
      <AnnouncementBar settings={settings} />
      <SiteHeader
        telegramUrl={settings.telegram_channel_url}
        contacts={contacts}
        brandName={settings.brand_name}
        logoPath={settings.logo_path}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SupportFab contacts={contacts} />
      <SiteProtection
        blockContextMenu={protection.blockContextMenu}
        blockShortcuts={protection.blockShortcuts}
        hideOnBlur={protection.hideOnBlur}
      />
      {/* Sits above the Telegram button, centred on it. */}
      <BackToTop
        label={nav('top')}
        hideOnModelPageMobile
        className="right-[1.375rem] bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:right-[1.875rem] md:bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
      />
    </div>
  );
}
