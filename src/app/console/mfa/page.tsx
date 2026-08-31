import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin-path';
import { MfaClient } from './MfaClient';

export const dynamic = 'force-dynamic';

export default async function AdminMfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(adminHref('/login'));

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') redirect(adminHref());

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <MfaClient />
    </div>
  );
}
