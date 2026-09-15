'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString } from '@/lib/cms/action';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  FEEDBACK_MEDIA_MAX,
  FEEDBACK_MEDIA_PATH,
  FEEDBACK_POSTER_PATH,
  readFeedbackMedia,
} from '@/lib/feedback';

const media = z
  .array(
    z.object({
      kind: z.enum(['image', 'video']),
      path: z.string().regex(FEEDBACK_MEDIA_PATH, 'bad path'),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      poster: z.string().regex(FEEDBACK_POSTER_PATH, 'bad poster').optional(),
    }),
  )
  .max(FEEDBACK_MEDIA_MAX)
  .default([]);

const fields = {
  model_id: z.string().uuid().nullable().default(null),
  media,
  author: z.string().trim().max(120),
  is_anonymous: z.boolean().default(false),
  // A calendar date or nothing; nothing means the site prints no date.
  reviewed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'bad date')
    .nullable()
    .default(null),
  role: z.string().trim().max(120).nullable().default(null),
  quote: i18nString,
  rating: z.coerce.number().int().min(1).max(5).nullable().default(null),
  is_published: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
};

export const upsertTestimonialAction = cmsAction({
  schema: z
    .object({ id: z.string().uuid().optional(), ...fields })
    .refine((v) => v.is_anonymous || v.author.length > 0, {
      path: ['author'],
      message: 'name or anonymous',
    })
    // Nothing to leak: an anonymous review never carries the real name.
    .transform((v) => (v.is_anonymous ? { ...v, author: '' } : v)),
  action: 'testimonial.upsert',
  entity: 'testimonials',
  handler: async ({ input, supabase }) => {
    const { id, ...rest } = input;

    // Media taken off an existing review should not keep paying for storage.
    let stale: string[] = [];
    if (id) {
      const { data: current } = await supabase
        .from('testimonials')
        .select('media')
        .eq('id', id)
        .maybeSingle();
      const keep = new Set(rest.media.flatMap((m) => [m.path, m.poster ?? '']));
      stale = readFeedbackMedia(current?.media)
        .flatMap((m) => [m.path, m.poster ?? ''])
        .filter((p) => p && !keep.has(p));
    }

    const q = id
      ? supabase.from('testimonials').update(rest).eq('id', id)
      : supabase.from('testimonials').insert(rest);
    const { error } = await q;
    if (error) return { ok: false, error: error.message };

    if (stale.length) {
      await createAdminClient().storage.from('models-public').remove(stale);
    }
    revalidatePath('/', 'layout');
    return { ok: true, data: { id } };
  },
});

export const deleteTestimonialAction = cmsAction({
  schema: z.object({ id: z.string().uuid() }),
  action: 'testimonial.delete',
  entity: 'testimonials',
  handler: async ({ input, supabase }) => {
    const { data: current } = await supabase
      .from('testimonials')
      .select('media')
      .eq('id', input.id)
      .maybeSingle();
    const { error } = await supabase.from('testimonials').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    const paths = readFeedbackMedia(current?.media).flatMap((m) => [m.path, m.poster ?? '']).filter(Boolean);
    if (paths.length) {
      await createAdminClient().storage.from('models-public').remove(paths);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
