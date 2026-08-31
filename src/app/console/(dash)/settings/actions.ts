'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString } from '@/lib/cms/action';

const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'must be https URL')
  .default('');

const schema = z.object({
  telegram_channel_url: urlOrEmpty,
  contact_email: z.string().trim().max(200).email().or(z.literal('')).default(''),
  phone: z.string().trim().max(40).default(''),
  socials: z
    .object({
      instagram: urlOrEmpty,
      facebook: urlOrEmpty,
      tiktok: urlOrEmpty,
    })
    .default({}),
  hero: z
    .object({
      headline: i18nString,
      sub: i18nString,
      image: z.string().trim().max(400).default(''),
    })
    .default({}),
  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: i18nString,
    })
    .default({}),
  maintenance_mode: z.boolean().default(false),
});

export const updateSettingsAction = cmsAction({
  schema,
  action: 'settings.update',
  entity: 'site_settings',
  handler: async ({ input, staff, supabase }) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ ...input, updated_by: staff.userId, updated_at: new Date().toISOString() })
      .eq('id', true);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
