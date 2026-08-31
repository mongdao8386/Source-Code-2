'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString } from '@/lib/cms/action';

const fields = {
  author: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).nullable().default(null),
  quote: i18nString,
  rating: z.coerce.number().int().min(1).max(5).nullable().default(null),
  is_published: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
};

export const upsertTestimonialAction = cmsAction({
  schema: z.object({ id: z.string().uuid().optional(), ...fields }),
  action: 'testimonial.upsert',
  entity: 'testimonials',
  handler: async ({ input, supabase }) => {
    const { id, ...rest } = input;
    const q = id
      ? supabase.from('testimonials').update(rest).eq('id', id)
      : supabase.from('testimonials').insert(rest);
    const { error } = await q;
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true, data: { id } };
  },
});

export const deleteTestimonialAction = cmsAction({
  schema: z.object({ id: z.string().uuid() }),
  action: 'testimonial.delete',
  entity: 'testimonials',
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
