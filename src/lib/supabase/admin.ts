import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { clientEnv, serverEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * Service-role client. Bypasses RLS entirely — treat every call as privileged.
 *
 * Only use it for operations that genuinely need elevated rights:
 *  - creating auth users / sending invites (Auth admin API)
 *  - writing audit_logs
 *  - reading admin_invites
 *
 * Never pass user-controlled filters straight through; always authorise the
 * caller first (see @/lib/auth/guards).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
