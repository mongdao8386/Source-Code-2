import 'server-only';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/supabase/types';

export type SessionStaff = {
  userId: string;
  email: string;
  profile: Profile;
  aal2: boolean;
};

/**
 * Resolves the signed-in staff member or `null`. Never throws.
 */
export async function getSessionStaff(): Promise<SessionStaff | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profile as Profile,
    aal2: aal?.currentLevel === 'aal2',
  };
}

/**
 * Guard for CMS server components. A non-staff caller gets a 404 (the CMS is
 * invisible), a staff caller without a second factor is bounced to /admin/mfa
 * by the middleware before reaching here.
 */
export async function requireStaff(): Promise<SessionStaff> {
  const staff = await getSessionStaff();
  if (!staff) notFound();
  return staff;
}

export async function requireOwner(): Promise<SessionStaff> {
  const staff = await requireStaff();
  if (staff.profile.role !== 'owner') notFound();
  return staff;
}
