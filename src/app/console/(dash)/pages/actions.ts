'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString, slug as slugSchema } from '@/lib/cms/action';

const fields = {
  slug: slugSchema,
  title: i18nString,
  body: i18nString,
  status: z.enum(['draft', 'published']).default('draft'),
  seo: z.object({ title: i18nString, description: i18nString }).default({}),
};

export const upsertPageAction = cmsAction({
  schema: z.object({ id: z.string().uuid().optional(), ...fields }),
  action: 'page.upsert',
  entity: 'pages',
  handler: async ({ input, staff, supabase }) => {
    const { id, ...rest } = input;
    const payload = { ...rest, updated_by: staff.userId };
    const q = id
      ? supabase.from('pages').update(payload).eq('id', id)
      : supabase.from('pages').insert(payload);
    const { error } = await q;
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true, data: { id } };
  },
});

export const deletePageAction = cmsAction({
  schema: z.object({ id: z.string().uuid() }),
  action: 'page.delete',
  entity: 'pages',
  handler: async ({ input, supabase }) => {
    const { error } = await supabase.from('pages').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
