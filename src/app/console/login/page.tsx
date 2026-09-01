import { getTranslations } from 'next-intl/server';
import { Brand } from '@/components/site/Brand';
import { getSiteSettings } from '@/lib/queries/public';
import { redirect } from 'next/navigation';
import { getSessionStaff } from '@/lib/auth/guards';
import { adminHref } from '@/lib/admin-path';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  // Already fully authenticated → straight to the console.
  const staff = await getSessionStaff();
  if (staff?.aal2) redirect(adminHref());

  const [t, settings] = await Promise.all([getTranslations('admin'), getSiteSettings()]);

  return (
    <div className="gutter-safe pad-safe-top pad-safe-bottom flex min-h-dvh flex-col items-center justify-center">
      <div className="mb-10 text-center">
        <p className="font-display text-2xl">
          <Brand name={settings.brand_name} />
        </p>
        <p className="kicker mt-2">{t('signIn')}</p>
      </div>
      <LoginForm />
    </div>
  );
}
