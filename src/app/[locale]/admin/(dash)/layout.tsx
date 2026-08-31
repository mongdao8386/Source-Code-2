import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { safeLocale } from '@/i18n/routing';
import { getSessionStaff } from '@/lib/auth/guards';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function DashLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = safeLocale((await params).locale);
  setRequestLocale(locale);

  const staff = await getSessionStaff();
  // Middleware already 404-cloaks non-staff and forces MFA; this is defence in depth.
  if (!staff) redirect(`/${locale}/admin/login`);
  if (!staff.aal2) redirect(`/${locale}/admin/mfa`);

  return (
    <AdminShell locale={locale} role={staff.profile.role} email={staff.email}>
      {children}
    </AdminShell>
  );
}
