import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionStaff } from '@/lib/auth/guards';
import { adminHref } from '@/lib/admin-path';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function DashLayout({ children }: { children: ReactNode }) {
  const staff = await getSessionStaff();
  // Middleware already 404-cloaks non-staff and forces MFA; this is defence in depth.
  if (!staff) redirect(adminHref('/login'));
  if (!staff.aal2) redirect(adminHref('/mfa'));

  return (
    <AdminShell role={staff.profile.role} email={staff.email}>
      {children}
    </AdminShell>
  );
}
