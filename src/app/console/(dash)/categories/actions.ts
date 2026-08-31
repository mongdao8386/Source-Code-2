'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString, slug as slugSchema } from '@/lib/cms/action';

const fields = {
  slug: slugSchema,
  name: i18nString,
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
};

export const upsertCategoryAction = cmsAction({
  schema: z.object({ id: z.string().uuid().optional(), ...fields }),
  action: 'category.upsert',
  entity: 'categories',
  handler: async ({ input, supabase }) => {
    const { id, ...rest } = input;
    const q = id
      ? supabase.from('categories').update(rest).eq('id', id)
      : supabase.from('categories').insert(rest);
    const { error } = await q;
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true, data: { id } };
  },
});

export const deleteCategoryAction = cmsAction({
  schema: z.object({ id: z.string().uuid() }),
  action: 'category.delete',
  entity: 'categories',
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.from('categories').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
