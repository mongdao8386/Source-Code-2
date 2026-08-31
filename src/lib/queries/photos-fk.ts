import 'server-only';

/**
 * There are two foreign keys between `models` and `model_photos`:
 *   model_photos.model_id   -> models.id          (the photos of a model)
 *   models.cover_photo_id   -> model_photos.id    (which one is the cover)
 *
 * That makes a bare `model_photos(*)` embed ambiguous and PostgREST rejects it
 * outright with PGRST201, so every embed must name the relationship it means.
 * Always use this constant rather than writing `model_photos(...)` directly.
 */
export const PHOTOS_FK = 'model_photos_model_id_fkey';

/**
 * Surfaces a PostgREST error instead of letting it collapse into an empty
 * result. A silent `data ?? []` reads as "no rows" and hides real failures —
 * that is exactly how the ambiguous-embed bug went unnoticed while the
 * database was empty.
 */
export function assertNoError(
  context: string,
  error: { code?: string; message: string } | null,
): void {
  if (!error) return;
  console.error(`[query:${context}] ${error.code ?? 'error'}: ${error.message}`);
  throw new Error(`Query "${context}" failed: ${error.message}`);
}
