import 'server-only';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

/**
 * Appends an immutable audit row. Uses the service role so the write always
 * succeeds regardless of the caller's RLS scope, but the caller must already
 * have been authorised (see @/lib/auth/guards).
 */
export async function audit(params: {
  actorId: string | null;
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
  await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    meta: params.meta ?? {},
    ip,
  });
}
