/**
 * One-off: create the single OWNER account.
 *
 *   OWNER_EMAIL=... OWNER_INITIAL_PASSWORD=... OWNER_FULL_NAME=... \
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npm run seed:owner
 *
 * Idempotent-ish: refuses to run if an owner profile already exists.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_INITIAL_PASSWORD;
const fullName = process.env.OWNER_FULL_NAME ?? 'Owner';

if (!url || !serviceKey || !email || !password) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OWNER_EMAIL / OWNER_INITIAL_PASSWORD');
  process.exit(1);
}
if (password.length < 12) {
  console.error('OWNER_INITIAL_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .maybeSingle();
  if (existing) {
    console.log('An owner already exists — nothing to do.');
    return;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error('createUser returned no user');
  }

  const { error } = await supabase.from('profiles').insert({
    id: created.data.user.id,
    role: 'owner',
    full_name: fullName,
    is_active: true,
  });
  if (error) {
    await supabase.auth.admin.deleteUser(created.data.user.id);
    throw error;
  }

  console.log(`Owner created: ${email}`);
  console.log('Sign in, you will be forced to enrol TOTP, then change this password.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
