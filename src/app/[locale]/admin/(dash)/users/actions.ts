'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction } from '@/lib/cms/action';
import { createAdminClient } from '@/lib/supabase/admin';

function tempPassword(): string {
  // 20 URL-safe chars, plenty of entropy for a single-use handoff secret.
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 20) + 'Aa1!';
}

export const createAdminAction = cmsAction<
  z.ZodObject<{ email: z.ZodString; full_name: z.ZodString }>,
  { email: string; password: string }
>({
  owner: true,
  schema: z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    full_name: z.string().trim().min(1).max(120),
  }),
  action: 'admin_user.create',
  entity: 'profiles',
  handler: async ({ input, staff }) => {
    const admin = createAdminClient();
    const password = tempPassword();

    const created = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (created.error || !created.data.user) {
      return { ok: false, error: created.error?.message ?? 'create_failed' };
    }

    const { error } = await admin.from('profiles').insert({
      id: created.data.user.id,
      role: 'admin',
      full_name: input.full_name,
      is_active: true,
      created_by: staff.userId,
    });
    if (error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      return { ok: false, error: error.message };
    }

    revalidatePath('/vi/admin/users');
    // The temp password is shown to the owner once; the admin must enrol TOTP
    // on first sign-in and should change it afterwards.
    return { ok: true, data: { email: input.email, password } };
  },
});

export const setAdminActiveAction = cmsAction({
  owner: true,
  schema: z.object({ id: z.string().uuid(), is_active: z.boolean() }),
  action: 'admin_user.set_active',
  entity: 'profiles',
  handler: async ({ input }) => {
    const admin = createAdminClient();
    const { data: target } = await admin
      .from('profiles')
      .select('role')
      .eq('id', input.id)
      .maybeSingle();
    if (target?.role === 'owner') return { ok: false, error: 'cannot_modify_owner' };

    const { error } = await admin
      .from('profiles')
      .update({ is_active: input.is_active })
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/vi/admin/users');
    return { ok: true, data: { id: input.id } };
  },
});

export const resetAdminMfaAction = cmsAction({
  owner: true,
  schema: z.object({ id: z.string().uuid() }),
  action: 'admin_user.reset_mfa',
  entity: 'profiles',
  handler: async ({ input }) => {
    const admin = createAdminClient();
    // Delete every factor so the admin re-enrols on next sign-in.
    const { data } = await admin.auth.admin.mfa.listFactors({ userId: input.id });
    for (const f of data?.factors ?? []) {
      await admin.auth.admin.mfa.deleteFactor({ userId: input.id, id: f.id });
    }
    return { ok: true, data: { id: input.id } };
  },
});

export const deleteAdminAction = cmsAction({
  owner: true,
  schema: z.object({ id: z.string().uuid() }),
  action: 'admin_user.delete',
  entity: 'profiles',
  handler: async ({ input, staff }) => {
    if (input.id === staff.userId) return { ok: false, error: 'cannot_delete_self' };
    const admin = createAdminClient();
    const { data: target } = await admin
      .from('profiles')
      .select('role')
      .eq('id', input.id)
      .maybeSingle();
    if (target?.role === 'owner') return { ok: false, error: 'cannot_delete_owner' };

    const { error } = await admin.auth.admin.deleteUser(input.id); // cascades profiles row
    if (error) return { ok: false, error: error.message };
    revalidatePath('/vi/admin/users');
    return { ok: true, data: { id: input.id } };
  },
});
