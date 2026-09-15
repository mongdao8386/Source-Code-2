import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { PHOTOS_FK, assertNoError } from '@/lib/queries/photos-fk';
import type {
  AuditLog,
  Category,
  Model,
  ModelPhoto,
  Page,
  SiteSettings,
} from '@/lib/supabase/types';
import type { FeedbackItem } from '@/lib/feedback';

/** All reads here run as the signed-in staff member (RLS-scoped). */

export async function adminDashboard() {
  const supabase = await createClient();
  const [models, photos, testimonials, categories, audit, clicks] = await Promise.all([
    supabase.from('models').select('status'),
    supabase.from('model_photos').select('id', { count: 'exact', head: true }),
    supabase.from('testimonials').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('click_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);

  const rows = (models.data ?? []) as Array<{ status: string }>;
  return {
    modelsPublished: rows.filter((r) => r.status === 'published').length,
    modelsDraft: rows.filter((r) => r.status === 'draft').length,
    photos: photos.count ?? 0,
    testimonials: testimonials.count ?? 0,
    categories: categories.count ?? 0,
    bookingClicks30d: clicks.count ?? 0,
    recentAudit: (audit.data ?? []) as AuditLog[],
  };
}

type PhotoStub = Pick<ModelPhoto, 'id' | 'storage_path' | 'is_cover' | 'sort_order'>;

export async function listModels(): Promise<
  Array<Model & { photo_count: number; cover_path: string | null }>
> {
  const supabase = await createClient();
  // The photo rows themselves rather than a count: the list shows a cover
  // thumbnail, and one embed is cheaper than a count plus a second query.
  const { data, error } = await supabase
    .from('models')
    .select(`*, model_photos!${PHOTOS_FK}(id, storage_path, is_cover, sort_order)`)
    .order('display_order', { ascending: true })
    .order('updated_at', { ascending: false });
  assertNoError('admin-list-models', error);
  return ((data ?? []) as Array<Model & { model_photos: PhotoStub[] }>).map((m) => {
    const photos = [...(m.model_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const cover =
      photos.find((p) => p.id === m.cover_photo_id) ??
      photos.find((p) => p.is_cover) ??
      photos[0] ??
      null;
    return { ...m, photo_count: photos.length, cover_path: cover?.storage_path ?? null };
  });
}

export async function getModelForEdit(
  id: string,
): Promise<(Model & { photos: ModelPhoto[] }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('models')
    .select(`*, model_photos!${PHOTOS_FK}(*)`)
    .eq('id', id)
    .maybeSingle();
  assertNoError('admin-model-edit', error);
  if (!data) return null;
  const row = data as Model & { model_photos: ModelPhoto[] };
  return {
    ...row,
    photos: [...(row.model_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as Category[];
}

export async function listPages(): Promise<Page[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('pages').select('*').order('slug');
  return (data ?? []) as Page[];
}

export async function listTestimonials(): Promise<FeedbackItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('testimonials')
    .select('*, model:models(stage_name, slug)')
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as FeedbackItem[];
}

/** Just enough of every model to fill a select. */
export async function listModelNames(): Promise<Array<{ id: string; stage_name: string }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('models')
    .select('id, stage_name')
    .order('stage_name', { ascending: true });
  return (data ?? []) as Array<{ id: string; stage_name: string }>;
}

export async function getSettings(): Promise<SiteSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('*').maybeSingle();
  return (data ?? null) as SiteSettings | null;
}

export async function listAudit(limit = 100): Promise<AuditLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditLog[];
}
