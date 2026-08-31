import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/supabase/types';

export type StaffRow = Profile & { email: string };

/** Owner-only listing. Joins auth email onto each profile. */
export async function listStaff(): Promise<StaffRow[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });

  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? '']));

  return ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? '',
  }));
}
