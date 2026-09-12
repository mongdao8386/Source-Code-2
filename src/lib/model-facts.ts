import type { Locale } from '@/i18n/routing';
import type { ModelDetail } from '@/lib/supabase/types';
import { fold } from '@/lib/model-template';
import { t } from '@/lib/i18n-text';

/**
 * Facts the boards pull out of a profile's free-form detail rows.
 *
 * There is no price column: the CMS keeps price as a detail row labelled
 * "Giá", because that is how the team writes it. The card and the profile
 * page want it up front, though — it is the first thing a visitor compares —
 * so this finds that row by label without the schema having to know.
 */
const PRICE_LABELS = new Set(['gia', 'gia tham khao', 'price', 'rate', 'gia dich vu']);

export function modelPrice(details: unknown, locale: Locale): string {
  if (!Array.isArray(details)) return '';
  for (const row of details as ModelDetail[]) {
    const vi = fold(row?.label?.vi ?? '');
    const en = fold(row?.label?.en ?? '');
    if (PRICE_LABELS.has(vi) || PRICE_LABELS.has(en)) return t(row?.value, locale);
  }
  return '';
}

/** "86 · 60 · 90" from the measurements bag, or '' when any of the three is missing. */
export function modelMeasure(measurements: unknown): string {
  const m = (measurements ?? {}) as Record<string, unknown>;
  const parts = ['bust', 'waist', 'hips'].map((k) => (m[k] == null ? '' : String(m[k]).trim()));
  return parts.every(Boolean) ? parts.join(' · ') : '';
}
