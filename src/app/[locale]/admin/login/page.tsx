import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Locale } from '@/i18n/routing';
import { getSessionStaff } from '@/lib/auth/guards';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already fully authenticated → straight to the console.
  const staff = await getSessionStaff();
  if (staff?.aal2) redirect(`/${locale}/admin`);

  const t = await getTranslations('admin');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <p className="font-display text-2xl">
          STUDIO<span className="text-gold">.</span>
        </p>
        <p className="kicker mt-2">{t('signIn')}</p>
      </div>
      <LoginForm />
    </div>
  );
}
