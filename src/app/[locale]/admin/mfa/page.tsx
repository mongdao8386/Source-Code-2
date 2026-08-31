import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Locale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { MfaClient } from './MfaClient';

export const dynamic = 'force-dynamic';

export default async function AdminMfaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/login`);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') redirect(`/${locale}/admin`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <MfaClient />
    </div>
  );
}
