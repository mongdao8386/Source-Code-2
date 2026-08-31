'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { cmsAction, i18nString, slug as slugSchema } from '@/lib/cms/action';
import { createAdminClient } from '@/lib/supabase/admin';

const measurements = z
  .object({
    bust: z.string().max(20).optional(),
    waist: z.string().max(20).optional(),
    hips: z.string().max(20).optional(),
    shoe: z.string().max(20).optional(),
    hair: z.string().max(40).optional(),
    eyes: z.string().max(40).optional(),
  })
  .default({});

const baseFields = {
  slug: slugSchema,
  stage_name: z.string().trim().min(1).max(120),
  status: z.enum(['draft', 'published']).default('draft'),
  height_cm: z.coerce.number().int().min(120).max(230).nullable().default(null),
  city: z.string().trim().max(80).nullable().default(null),
  experience_years: z.coerce.number().int().min(0).max(60).nullable().default(null),
  bio: i18nString,
  measurements,
  category_ids: z.array(z.string().uuid()).max(20).default([]),
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
  seo: z
    .object({ title: i18nString, description: i18nString })
    .default({}),
};

export const createModelAction = cmsAction({
  schema: z.object(baseFields),
  action: 'model.create',
  entity: 'models',
  handler: async ({ input, staff, supabase }) => {
    const { data, error } = await supabase
      .from('models')
      .insert({
        ...input,
        created_by: staff.userId,
        updated_by: staff.userId,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true, data: { id: data.id } };
  },
});

export const updateModelAction = cmsAction({
  schema: z.object({ id: z.string().uuid(), ...baseFields }),
  action: 'model.update',
  entity: 'models',
  handler: async ({ input, staff, supabase }) => {
    const { id, ...rest } = input;
    const { data: current } = await supabase
      .from('models')
      .select('status, published_at')
      .eq('id', id)
      .maybeSingle();

    const published_at =
      rest.status === 'published'
        ? (current?.published_at ?? new Date().toISOString())
        : null;

    const { error } = await supabase
      .from('models')
      .update({ ...rest, updated_by: staff.userId, published_at })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true, data: { id } };
  },
});

export const deleteModelAction = cmsAction({
  schema: z.object({ id: z.string().uuid() }),
  action: 'model.delete',
  entity: 'models',
  handler: async ({ input, supabase }) => {
    // collect storage paths first (rows cascade on delete)
    const { data: photos } = await supabase
      .from('model_photos')
      .select('storage_path')
      .eq('model_id', input.id);

    const { error } = await supabase.from('models').delete().eq('id', input.id);
    if (error) return { ok: false, error: error.message };

    const paths = (photos ?? []).map((p) => p.storage_path);
    if (paths.length) {
      await createAdminClient().storage.from('models-public').remove(paths);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});

export const setCoverAction = cmsAction({
  schema: z.object({ modelId: z.string().uuid(), photoId: z.string().uuid() }),
  action: 'model.set_cover',
  entity: 'models',
  handler: async ({ input, supabase }) => {
    await supabase.from('model_photos').update({ is_cover: false }).eq('model_id', input.modelId);
    await supabase.from('model_photos').update({ is_cover: true }).eq('id', input.photoId);
    const { error } = await supabase
      .from('models')
      .update({ cover_photo_id: input.photoId })
      .eq('id', input.modelId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});

export const reorderPhotosAction = cmsAction({
  schema: z.object({
    modelId: z.string().uuid(),
    order: z.array(z.string().uuid()).max(200),
  }),
  action: 'model.reorder_photos',
  entity: 'model_photos',
  handler: async ({ input, supabase }) => {
    for (let i = 0; i < input.order.length; i++) {
      await supabase
        .from('model_photos')
        .update({ sort_order: i })
        .eq('id', input.order[i]!)
        .eq('model_id', input.modelId);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});

export const deletePhotoAction = cmsAction({
  schema: z.object({ photoId: z.string().uuid() }),
  action: 'model_photo.delete',
  entity: 'model_photos',
  handler: async ({ input, supabase }) => {
    const { data: photo } = await supabase
      .from('model_photos')
      .select('storage_path, model_id, is_cover')
      .eq('id', input.photoId)
      .maybeSingle();
    if (!photo) return { ok: false, error: 'not_found' };

    const { error } = await supabase.from('model_photos').delete().eq('id', input.photoId);
    if (error) return { ok: false, error: error.message };

    await createAdminClient().storage.from('models-public').remove([photo.storage_path]);
    if (photo.is_cover) {
      await supabase
        .from('models')
        .update({ cover_photo_id: null })
        .eq('id', photo.model_id);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  },
});
