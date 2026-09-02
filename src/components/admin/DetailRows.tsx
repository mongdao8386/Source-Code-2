'use client';

import type { ModelDetail } from '@/lib/supabase/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { useTranslate } from './useTranslate';

/**
 * Free-form spec rows. Anything the fixed columns above do not cover goes here
 * and lands on the public page in this order — so a new fact is a CMS edit, not
 * a migration. Rows left blank or half-filled are dropped server-side, so an
 * abandoned row can simply be saved over.
 *
 * A blank row costs four boxes of typing, two of them in a language the
 * operator may not write. The presets below fill both halves of the label so
 * only the value is left, and the per-row translate button does the English
 * side of the value from the Vietnamese.
 */

/**
 * Labels common enough to be worth a click. Deliberately none that the fixed
 * fields already cover — height, city and years of experience are columns, and
 * bust/waist/hips/shoe/hair/eyes are the measurements block.
 */
const PRESETS: ReadonlyArray<{ vi: string; en: string }> = [
  { vi: 'Cân nặng', en: 'Weight' },
  { vi: 'Quốc tịch', en: 'Nationality' },
  { vi: 'Ngôn ngữ', en: 'Languages' },
  { vi: 'Cỡ trang phục', en: 'Dress size' },
  { vi: 'Hình xăm', en: 'Tattoos' },
  { vi: 'Xỏ khuyên', en: 'Piercings' },
  { vi: 'Kỹ năng', en: 'Skills' },
  { vi: 'Bằng lái xe', en: 'Driving licence' },
];

const MAX_ROWS = 30;

function DetailRow({
  row,
  index,
  last,
  onPatch,
  onMove,
  onRemove,
}: {
  row: ModelDetail;
  index: number;
  last: boolean;
  onPatch: (p: Partial<ModelDetail>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { translate, busy, err, available } = useTranslate();

  const labelVi = row.label.vi ?? '';
  const valueVi = row.value.vi ?? '';
  const labelEn = row.label.en ?? '';
  const valueEn = row.value.en ?? '';

  // One call for the row rather than one per box: DeepL bills per character
  // either way, but this is a single round trip and a single failure to read.
  async function fill() {
    const out = await translate([labelVi, valueVi]);
    if (!out) return;
    onPatch({
      label: { ...row.label, en: labelEn.trim() || out[0] || '' },
      value: { ...row.value, en: valueEn.trim() || out[1] || '' },
    });
  }

  const canTranslate =
    (labelVi.trim() !== '' && labelEn.trim() === '') ||
    (valueVi.trim() !== '' && valueEn.trim() === '');

  return (
    <div className="border border-line-strong p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label={`Nhãn VI (dòng ${index + 1})`}
          placeholder="Nhãn · VI"
          value={labelVi}
          onChange={(e) => onPatch({ label: { ...row.label, vi: e.target.value } })}
        />
        <Input
          aria-label={`Label EN (row ${index + 1})`}
          placeholder="Label · EN"
          value={labelEn}
          onChange={(e) => onPatch({ label: { ...row.label, en: e.target.value } })}
        />
        <Input
          aria-label={`Giá trị VI (dòng ${index + 1})`}
          placeholder="Giá trị · VI"
          value={valueVi}
          onChange={(e) => onPatch({ value: { ...row.value, vi: e.target.value } })}
        />
        <Input
          aria-label={`Value EN (row ${index + 1})`}
          placeholder="Value · EN"
          value={valueEn}
          onChange={(e) => onPatch({ value: { ...row.value, en: e.target.value } })}
        />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs uppercase tracking-[0.14em]">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="text-bone-dim hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
        >
          ↑ Lên
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={last}
          className="text-bone-dim hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
        >
          ↓ Xuống
        </button>
        {available && (
          <button
            type="button"
            onClick={fill}
            disabled={busy || !canTranslate}
            title="Điền các ô EN còn trống từ tiếng Việt"
            className="text-bone-dim hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
          >
            {busy ? 'Đang dịch…' : 'Dịch → EN'}
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-red-400 hover:text-red-300"
        >
          Xoá dòng
        </button>
      </div>

      {err && <p className="mt-2 text-xs normal-case tracking-normal text-red-300">{err}</p>}
    </div>
  );
}

export function DetailRows({
  value,
  onChange,
}: {
  value: ModelDetail[];
  onChange: (v: ModelDetail[]) => void;
}) {
  const patch = (i: number, p: Partial<ModelDetail>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  const add = (label: { vi?: string; en?: string } = {}) =>
    onChange([...value, { label, value: {} }]);

  const room = value.length < MAX_ROWS;
  const used = new Set(value.map((r) => (r.label.vi ?? '').trim().toLowerCase()));

  return (
    <fieldset>
      <legend className="kicker mb-2">Thông tin chi tiết thêm</legend>
      <p className="mb-4 text-xs text-bone-faint">
        Hiện dưới phần thông số trên trang người mẫu, theo đúng thứ tự ở đây.
        Dòng để trống sẽ bị bỏ qua.
      </p>

      <div className="space-y-4">
        {value.map((row, i) => (
          <DetailRow
            key={i}
            row={row}
            index={i}
            last={i === value.length - 1}
            onPatch={(p) => patch(i, p)}
            onMove={(dir) => move(i, dir)}
            onRemove={() => onChange(value.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      {room && (
        <div className={value.length ? 'mt-4' : ''}>
          <Button type="button" variant="outline" size="sm" onClick={() => add()}>
            + Thêm dòng trống
          </Button>

          <p className="mb-2 mt-4 text-xs text-bone-faint">Hoặc thêm nhanh một mục có sẵn:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter((p) => !used.has(p.vi.toLowerCase())).map((p) => (
              <button
                key={p.vi}
                type="button"
                onClick={() => add({ vi: p.vi, en: p.en })}
                className="border border-line-strong px-2.5 py-1.5 text-xs text-bone-dim transition-colors hover:border-gold hover:text-gold"
              >
                + {p.vi}
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}
