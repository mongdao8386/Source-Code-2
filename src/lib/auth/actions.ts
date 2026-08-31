'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';
import { loginLimiter } from '@/lib/ratelimit';
import { defaultLocale, safeLocale } from '@/i18n/routing';

export type ActionState = { error?: string; ok?: boolean; data?: unknown };

function clientIp(h: Headers): string {
  return (
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

const credsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  locale: z.enum(['vi', 'en']).default(defaultLocale),
});

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { error: 'invalid' };
  const { email, password, locale } = parsed.data;

  const h = await headers();
  const ip = clientIp(h);
  const limited = await loginLimiter(ip);
  if (!limited.ok) return { error: 'rate_limited' };
  const perUser = await loginLimiter(email.toLowerCase());
  if (!perUser.ok) return { error: 'rate_limited' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await audit({
      actorId: null,
      action: 'auth.login_failed',
      entity: 'auth',
      meta: { email },
    });
    return { error: 'bad_credentials' };
  }

  // Must be an active staff member, otherwise the CMS does not exist for them.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'bad_credentials' };
  }

  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  await audit({
    actorId: data.user.id,
    action: 'auth.login',
    entity: 'auth',
    entityId: data.user.id,
  });

  // aal1 now — middleware will route to /admin/mfa for the second factor.
  redirect(`/${locale}/admin`);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut();
  if (user) {
    await audit({ actorId: user.id, action: 'auth.logout', entity: 'auth', entityId: user.id });
  }
  redirect(`/${locale}/admin/login`);
}

/**
 * The MFA actions below are reachable by any signed-in Supabase user, not just
 * CMS staff. This site never signs visitors up, but a project with email signup
 * still enabled would otherwise expose them — so gate on an active profile row.
 */
async function callerIsStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .maybeSingle();
  return !!data?.is_active;
}

/** Begin TOTP enrolment. Returns a QR data-URI + secret for the authenticator. */
export async function enrollTotpAction(): Promise<ActionState> {
  const supabase = await createClient();
  if (!(await callerIsStaff(supabase))) return { error: 'enroll_failed' };

  // Reuse an existing unverified factor rather than piling up new ones.
  const existing = await supabase.auth.mfa.listFactors();
  const stale = (existing.data?.all ?? []).find(
    (f) => f.factor_type === 'totp' && f.status === 'unverified',
  );
  if (stale) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `totp-${Date.now()}`,
  });
  if (error || !data || !('totp' in data)) return { error: 'enroll_failed' };

  const QRCode = (await import('qrcode')).default;
  const qr = await QRCode.toDataURL(data.totp.uri, {
    margin: 1,
    width: 220,
    color: { dark: '#0a0a0b', light: '#f4f1ea' },
  });

  return {
    ok: true,
    data: { factorId: data.id, secret: data.totp.secret, qr },
  };
}

const verifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
  locale: z.enum(['vi', 'en']).default(defaultLocale),
});

export async function verifyTotpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verifySchema.safeParse({
    factorId: formData.get('factorId'),
    code: formData.get('code'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { error: 'invalid_code' };
  const { factorId, code, locale } = parsed.data;

  const h = await headers();
  const limited = await loginLimiter(`mfa:${clientIp(h)}`);
  if (!limited.ok) return { error: 'rate_limited' };

  const supabase = await createClient();
  if (!(await callerIsStaff(supabase))) return { error: 'invalid_code' };

  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: 'invalid_code' };

  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) {
    await audit({
      actorId: null,
      action: 'auth.mfa_failed',
      entity: 'auth',
      meta: { factorId },
    });
    return { error: 'invalid_code' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await audit({
    actorId: user?.id ?? null,
    action: 'auth.mfa_verified',
    entity: 'auth',
    entityId: user?.id,
  });

  redirect(`/${locale}/admin`);
}

/** Lists the caller's factors so /admin/mfa can decide enrol vs. verify. */
export async function listFactorsAction(): Promise<ActionState> {
  const supabase = await createClient();
  if (!(await callerIsStaff(supabase))) return { error: 'list_failed' };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { error: 'list_failed' };
  const totp = (data?.totp ?? []).filter((f) => f.status === 'verified');
  const unverified = (data?.all ?? []).filter(
    (f) => f.factor_type === 'totp' && f.status === 'unverified',
  );
  return { ok: true, data: { verified: totp, unverified } };
}
