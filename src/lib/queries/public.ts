import 'server-only';

import { cache } from 'react';
import { createAnonClient } from '@/lib/supabase/anon';
import { PHOTOS_FK, assertNoError } from '@/lib/queries/photos-fk';
import type {
  Category,
  Model,
  ModelPhoto,
  Page,
  PublicSiteSettings,
  Testimonial,
} from '@/lib/supabase/types';

/**
 * Public read layer. Every call runs through the anon/session client, so RLS
 * guarantees only published rows come back even if a filter is forgotten.
 * `cache()` dedupes within a single request.
 */

export const getSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('public_site_settings')
    .select('*')
    .maybeSingle();
  assertNoError('site-settings', error);
  return (
    data ?? {
      telegram_channel_url: '',
      socials: {},
      hero: {},
      announcement: {},
      maintenance_mode: false,
      brand_name: 'STUDIO',
      logo_path: '',
      favicon_path: '',
      og_image_path: '',
      accent_color: '#c8a253',
    }
  );
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  assertNoError('categories', error);
  return data ?? [];
});

export type ModelListItem = Model & { cover: ModelPhoto | null };

export const getPublishedModels = cache(
  async (opts: { category?: string; city?: string; limit?: number } = {}): Promise<
    ModelListItem[]
  > => {
    const supabase = createAnonClient();
    let query = supabase
      .from('models')
      .select(`*, model_photos!${PHOTOS_FK}(*)`)
      .eq('status', 'published')
      .order('display_order', { ascending: true })
      .order('published_at', { ascending: false });

    if (opts.city) query = query.eq('city', opts.city);
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    assertNoError('published-models', error);
    let rows = (data ?? []) as Array<Model & { model_photos: ModelPhoto[] }>;

    if (opts.category) {
      const cats = await getCategories();
      const cat = cats.find((c) => c.slug === opts.category);
      if (cat) rows = rows.filter((m) => m.category_ids.includes(cat.id));
    }

    return rows.map((m) => {
      const photos = [...(m.model_photos ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const cover =
        photos.find((p) => p.id === m.cover_photo_id) ?? photos[0] ?? null;
      return { ...m, cover };
    });
  },
);

export const getModelBySlug = cache(
  async (
    slug: string,
  ): Promise<(Model & { photos: ModelPhoto[] }) | null> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('models')
      .select(`*, model_photos!${PHOTOS_FK}(*)`)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    assertNoError('model-by-slug', error);
    if (!data) return null;
    const row = data as Model & { model_photos: ModelPhoto[] };
    const photos = [...(row.model_photos ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    return { ...row, photos };
  },
);

export const getPublishedTestimonials = cache(async (): Promise<Testimonial[]> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  assertNoError('testimonials', error);
  return data ?? [];
});

export const getPage = cache(async (slug: string): Promise<Page | null> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  assertNoError('page', error);
  return data ?? null;
});
