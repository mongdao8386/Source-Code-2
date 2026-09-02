'use client';

import { Input, Label, Textarea } from '@/components/ui/Field';
import { useTranslate } from './useTranslate';

export type Bag = { vi?: string; en?: string };

/**
 * A bilingual field: Vietnamese is typed, English can be filled from it.
 *
 * This used to exist twice — once in ModelForm, once in SettingsForm — with
 * the settings copy carrying aria-labels the model copy had lost. One
 * component now, so the translate button did not have to be built twice.
 *
 * Translation never overwrites silently: the button is disabled once English
 * has text in it, because the common case for a filled EN box is that someone
 * corrected the machine and does not want it undone by a stray click.
 */
export function TwoLang({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: Bag;
  onChange: (v: Bag) => void;
  textarea?: boolean;
}) {
  const C = textarea ? Textarea : Input;
  const { translate, busy, err, available } = useTranslate();

  const vi = value.vi ?? '';
  const en = value.en ?? '';

  async function fill() {
    const out = await translate([vi]);
    if (out) onChange({ ...value, en: out[0] ?? '' });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {available && (
          <button
            type="button"
            onClick={fill}
            disabled={busy || !vi.trim() || en.trim() !== ''}
            title={
              en.trim() !== ''
                ? 'Xoá ô EN trước nếu muốn dịch lại'
                : 'Dịch nội dung tiếng Việt sang tiếng Anh'
            }
            className="text-[0.625rem] uppercase tracking-[0.14em] text-bone-dim transition-colors hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
          >
            {busy ? 'Đang dịch…' : 'Dịch → EN'}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <C
          aria-label={`${label} VI`}
          placeholder="VI"
          value={vi}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, vi: e.target.value })
          }
        />
        <C
          aria-label={`${label} EN`}
          placeholder="EN"
          value={en}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })
          }
        />
      </div>

      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}
