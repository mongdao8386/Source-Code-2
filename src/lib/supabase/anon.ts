import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * Stateless anon client — no cookies, no session. Safe to call at build time
 * (generateStaticParams, sitemap) and during ISR. Only ever sees data that
 * RLS exposes to the `anon` role, i.e. published content.
 */
export function createAnonClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
