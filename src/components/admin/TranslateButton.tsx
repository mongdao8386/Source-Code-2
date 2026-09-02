'use client';

import { useTranslate } from './useTranslate';

/**
 * "Dịch → EN" for one pair of fields.
 *
 * TwoLang covers the forms that keep bilingual text as a { vi, en } bag, but
 * categories, pages and testimonials each hold theirs as two flat strings.
 * Rather than restructure three working forms, the button takes the two values
 * it needs and hands back a string.
 *
 * Disabled once English has text: the usual reason it is already filled is
 * that someone corrected the machine, and a stray click should not undo that.
 */
export function TranslateButton({
  source,
  target,
  onResult,
}: {
  /** The Vietnamese text to translate from. */
  source: string;
  /** The current English text — a filled one disables the button. */
  target: string;
  onResult: (english: string) => void;
}) {
  const { translate, busy, err, available } = useTranslate();

  if (!available) return null;

  const ready = source.trim() !== '' && target.trim() === '';

  return (
    <>
      <button
        type="button"
        disabled={busy || !ready}
        title={
          target.trim() !== ''
            ? 'Xoá ô EN trước nếu muốn dịch lại'
            : 'Dịch nội dung tiếng Việt sang tiếng Anh'
        }
        onClick={async () => {
          const out = await translate([source]);
          if (out) onResult(out[0] ?? '');
        }}
        className="text-[0.625rem] uppercase tracking-[0.14em] text-bone-dim transition-colors hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
      >
        {busy ? 'Đang dịch…' : 'Dịch → EN'}
      </button>
      {err && <p className="mt-1 text-xs normal-case tracking-normal text-red-300">{err}</p>}
    </>
  );
}
