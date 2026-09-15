/**
 * Feedback media — the screenshots and clips attached to a customer review.
 *
 * Stored as jsonb on `testimonials.media`, so nothing about the shape is
 * guaranteed at read time: every entry is re-checked here, and a path is
 * accepted only if it is one this app's upload route wrote. Client-safe so
 * the CMS and the public page agree on what counts.
 */

import type { Testimonial } from '@/lib/supabase/types';

/** A review with the model it points at, as the queries return it. */
export type FeedbackItem = Testimonial & {
  model: { stage_name: string; slug: string } | null;
};

export type FeedbackMedia = {
  kind: 'image' | 'video';
  /** Storage path in the public bucket, e.g. feedback/<uuid>.webp */
  path: string;
  width?: number;
  height?: number;
  /** Video only: a still to show before play, feedback/<uuid>-poster.webp */
  poster?: string;
};

/** Only objects the feedback upload route writes. */
export const FEEDBACK_MEDIA_PATH = /^feedback\/[0-9a-f-]{36}\.(webp|mp4|webm)$/;
export const FEEDBACK_POSTER_PATH = /^feedback\/[0-9a-f-]{36}-poster\.webp$/;

export const FEEDBACK_MEDIA_MAX = 12;

export function readFeedbackMedia(raw: unknown): FeedbackMedia[] {
  if (!Array.isArray(raw)) return [];
  const out: FeedbackMedia[] = [];
  for (const item of raw.slice(0, FEEDBACK_MEDIA_MAX)) {
    const o = (item ?? {}) as Record<string, unknown>;
    const path = typeof o.path === 'string' ? o.path.trim() : '';
    if (!FEEDBACK_MEDIA_PATH.test(path)) continue;
    const kind = /\.(mp4|webm)$/.test(path) ? 'video' : 'image';
    const dim = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined;
    const poster =
      kind === 'video' && typeof o.poster === 'string' && FEEDBACK_POSTER_PATH.test(o.poster.trim())
        ? o.poster.trim()
        : undefined;
    out.push({ kind, path, width: dim(o.width), height: dim(o.height), poster });
  }
  return out;
}

/** The number of stars, 1–5, or null when a review has none. */
export function readRating(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : null;
}
