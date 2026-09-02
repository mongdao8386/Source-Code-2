'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString } from '@/lib/cms/action';

/**
 * Optional free text.
 *
 * Every column behind these fields is `not null default ''`, so "no value" is
 * stored as the empty string rather than NULL. The CMS, though, can legitimately
 * send null (a field the form cleared) or whitespace (a field someone spaced
 * out), and neither should cost the operator a whole failed save of unrelated
 * settings. Anything empty lands as ''.
 *
 * Before this, `null` failed with "Expected string, received null" and — for
 * contact_email — a single space failed with "Invalid email", because the
 * `.or(z.literal(''))` branch tested the raw value and never saw the trim.
 */
const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v ?? '').trim())
    .pipe(z.string().max(max));

const urlOrEmpty = optionalText(300).refine(
  (v) => v === '' || /^https:\/\/\S+$/.test(v),
  'must be https URL',
);

// Only paths this app wrote: the brand/ prefix plus a generated filename.
const BRAND_PATH = /^brand\/[a-z]+-[0-9a-f-]{36}\.(webp|png)$/;

const storagePath = optionalText(300).refine(
  (v) => v === '' || BRAND_PATH.test(v),
  'bad path',
);

const schema = z.object({
  telegram_channel_url: urlOrEmpty,
  brand_name: z.string().trim().min(1).max(40).default('STUDIO'),
  logo_path: storagePath,
  favicon_path: storagePath,
  og_image_path: storagePath,
  // Mirrors the CHECK constraint; the value lands in a CSS custom property.
  accent_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#c8a253'),
  contact_email: optionalText(200).refine(
    (v) => v === '' || z.string().email().safeParse(v).success,
    'must be an email',
  ),
  phone: optionalText(40),
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
      // Uploaded objects only, same rule as the other brand assets.
      //
      // This field used to take any string, and its label offered "storage
      // path or https URL". next/image never honoured that: remotePatterns in
      // next.config.mjs admits Supabase public storage and nothing else, so an
      // external URL was accepted here, stored, and then silently dropped at
      // render — a black hero with no error anywhere to explain it.
      image: optionalText(400).refine(
        (v) => v === '' || BRAND_PATH.test(v),
        'must be an uploaded image',
      ),
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
