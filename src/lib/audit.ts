import 'server-only';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

/**
 * Appends an immutable audit row. Uses the service role so the write always
 * succeeds regardless of the caller's RLS scope, but the caller must already
 * have been authorised (see @/lib/auth/guards).
 *
 * `actorEmail` is stored alongside `actorId` on purpose: deleting a staff
 * account nulls actor_id (see migration 20260831000003), and without the
 * denormalised address the trail of what that person did would lose its owner.
 */
export async function audit(params: {
  actorId: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Json;
}): Promise<void> {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get('x-real-ip') ??
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
  } catch {
    /* not in a request scope */
  }

  const supabase = createAdminClient();

  // Fall back to looking the address up once, so callers that only have an id
  // still produce an attributable row.
  let actorEmail = params.actorEmail ?? null;
  if (!actorEmail && params.actorId) {
    const { data } = await supabase.auth.admin.getUserById(params.actorId);
    actorEmail = data?.user?.email ?? null;
  }

  await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    actor_email: actorEmail,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    meta: params.meta ?? {},
    ip,
  });
}
