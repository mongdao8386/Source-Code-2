import type { I18nText } from '@/lib/supabase/types';
import type { Locale } from '@/i18n/routing';

/**
 * Reads a bilingual jsonb bag with a graceful fallback chain:
 * requested locale → the other locale → empty string.
 */
export function t(value: unknown, locale: Locale): string {
  if (!value || typeof value !== 'object') return '';
  const bag = value as I18nText;
  const other: Locale = locale === 'vi' ? 'en' : 'vi';
  return (bag[locale] ?? bag[other] ?? '').trim();
}

/** Nested localised field, e.g. hero.headline. */
export function tField(
  obj: unknown,
  path: string,
  locale: Locale,
): string {
  if (!obj || typeof obj !== 'object') return '';
  const node = (obj as Record<string, unknown>)[path];
  return t(node, locale);
}

/**
 * Reads a plain (non-bilingual) string out of a jsonb bag.
 *
 * Needed because `hero` mixes shapes: headline/sub are { vi, en } but `image`
 * is a bare path. Passing that path through `t()` returns '' — it rejects
 * anything that is not an object — which silently blanked the hero image.
 */
export function tPlain(obj: unknown, path: string): string {
  if (!obj || typeof obj !== 'object') return '';
  const v = (obj as Record<string, unknown>)[path];
  return typeof v === 'string' ? v.trim() : '';
}
