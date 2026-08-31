import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { getSettings } from '@/lib/queries/admin';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [t, settings] = await Promise.all([getTranslations('admin'), getSettings()]);

  if (!settings) {
    return (
      <>
        <PageHeader title={t('nav.settings')} />
        <p className="text-sm text-bone-dim">
          site_settings row missing — run <code>supabase/seed.sql</code>.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('nav.settings')} description="Cấu hình toàn site." />
      <SettingsForm settings={settings} />
    </>
  );
}
