'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminHref } from '@/lib/admin-path';
import type { Category } from '@/lib/supabase/types';
import { MODEL_TEMPLATE, parseModelTemplate } from '@/lib/model-template';
import { createModelAction } from '@/app/console/(dash)/models/actions';
import { Button } from '@/components/ui/Button';
import { FormError, Textarea } from '@/components/ui/Field';
import { ModelForm } from './ModelForm';
import { cn } from '@/lib/cn';

/**
 * New model = one paste.
 *
 * The left side is the text, pre-filled with the blank template so the lines
 * to fill are already there. The right side reads it as you type and shows
 * exactly what will be saved, so a mis-typed key is caught before the button
 * is pressed rather than after. Photos come next, on the edit page, which is
 * where this lands after saving.
 *
 * The full form is still one click away for the rare profile the template
 * cannot express.
 */
const catName = (c: Category) =>
  (c.name as { vi?: string; en?: string })?.vi ||
  (c.name as { vi?: string; en?: string })?.en ||
  c.slug;

export function QuickAddModel({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(MODEL_TEMPLATE);
  const [publish, setPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const cats = useMemo(
    () => categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    [categories],
  );
  const parsed = useMemo(() => parseModelTemplate(text, cats), [text, cats]);
  const ready = parsed.stage_name.trim() !== '';

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(MODEL_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the textarea already holds the template */
    }
  }

  function create() {
    if (!ready) return;
    setError(null);
    const status = parsed.status ?? (publish ? 'published' : 'draft');
    start(async () => {
      const res = await createModelAction({
        slug: parsed.slug,
        stage_name: parsed.stage_name,
        status,
        height_cm: parsed.height_cm,
        city: parsed.city,
        experience_years: parsed.experience_years,
        bio: { vi: parsed.bio },
        display_order: parsed.display_order ?? 0,
        category_ids: parsed.category_ids,
        measurements: {
          bust: parsed.bust,
          waist: parsed.waist,
          hips: parsed.hips,
          shoe: parsed.shoe,
          hair: parsed.hair,
          eyes: parsed.eyes,
        },
        seo: {},
        details: parsed.details,
      });
      if (!res.ok) {
        setError(
          res.error === 'validation'
            ? describeValidation(res.fieldErrors)
            : /duplicate|unique/i.test(res.error)
              ? `Slug “${parsed.slug}” đã có. Thêm dòng “Slug: ten-khac” vào văn bản.`
              : res.error,
        );
        return;
      }
      const id = (res.data as { id?: string })?.id;
      router.replace(adminHref(id ? `/models/${id}` : '/models'));
    });
  }

  if (full) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setFull(false)}
          className="text-xs uppercase tracking-[0.16em] text-bone-dim hover:text-gold"
        >
          ← Quay lại dán theo mẫu
        </button>
        <ModelForm model={null} categories={categories} />
      </div>
    );
  }

  const spec: Array<[string, string]> = [];
  if (parsed.height_cm) spec.push(['Chiều cao', `${parsed.height_cm} cm`]);
  if (parsed.bust) spec.push(['Số đo', `${parsed.bust}-${parsed.waist}-${parsed.hips}`]);
  if (parsed.city) spec.push(['Khu vực', parsed.city]);
  if (parsed.experience_years != null) spec.push(['Kinh nghiệm', `${parsed.experience_years} năm`]);
  if (parsed.shoe) spec.push(['Giày', parsed.shoe]);
  if (parsed.hair) spec.push(['Tóc', parsed.hair]);
  if (parsed.eyes) spec.push(['Mắt', parsed.eyes]);
  for (const d of parsed.details) spec.push([d.label.vi ?? '', d.value.vi ?? '']);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)]">
      {/* ── The paste ─────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-bone-dim">
            Dán văn bản theo mẫu. Mỗi dòng là <span className="text-bone">Nhãn: giá trị</span>;
            dòng nào không hiểu sẽ thành “thông tin chi tiết thêm”.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyTemplate}>
              {copied ? 'Đã sao chép' : 'Sao chép mẫu trống'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setText(MODEL_TEMPLATE)}
              disabled={text === MODEL_TEMPLATE}
            >
              Xoá
            </Button>
          </div>
        </div>

        <Textarea
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="mt-4 font-mono text-[13px] leading-relaxed"
          aria-label="Văn bản hồ sơ theo mẫu"
        />

        <details className="mt-4 text-xs text-bone-faint">
          <summary className="cursor-pointer text-bone-dim hover:text-bone">
            Các nhãn được hiểu
          </summary>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {LEGEND.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 text-bone-dim">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">
            Không phân biệt hoa thường hay dấu. Dòng không có dấu hai chấm sẽ nối vào dòng
            trên (dùng cho phần giới thiệu nhiều dòng).
          </p>
        </details>
      </div>

      {/* ── What will be saved ────────────────────────────────── */}
      <aside className="lg:sticky lg:top-6 lg:h-fit">
        <div className="border border-line bg-surface-1/40 p-5">
          <p className="kicker">Sẽ lưu</p>

          <p className={cn('mt-4 font-display text-2xl', ready ? 'text-bone' : 'text-bone-faint')}>
            {parsed.stage_name || 'Chưa có tên'}
          </p>
          <p className="mt-1 text-xs text-bone-faint">
            {ready ? `/nguoi-mau/${parsed.slug}` : 'Cần dòng “Tên: …”'}
          </p>

          {parsed.category_ids.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {parsed.category_ids.map((id) => {
                const c = categories.find((x) => x.id === id);
                return c ? (
                  <li
                    key={id}
                    className="border border-gold px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-gold"
                  >
                    {catName(c)}
                  </li>
                ) : null;
              })}
            </ul>
          )}

          {spec.length > 0 && (
            <dl className="mt-5 divide-y divide-line border-y border-line text-sm">
              {spec.map(([k, v], i) => (
                <div key={i} className="flex justify-between gap-4 py-2">
                  <dt className="text-bone-dim">{k}</dt>
                  <dd className="text-right text-bone">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {parsed.bio && (
            <p className="mt-4 line-clamp-6 whitespace-pre-line text-xs leading-relaxed text-bone-dim">
              {parsed.bio}
            </p>
          )}

          {parsed.warnings.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-amber-300/90">
              {parsed.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}

          <label className="mt-5 flex items-center gap-3 text-sm text-bone-dim">
            <input
              type="checkbox"
              checked={parsed.status ? parsed.status === 'published' : publish}
              disabled={parsed.status != null}
              onChange={(e) => setPublish(e.target.checked)}
            />
            Hiện lên site ngay
            {parsed.status && (
              <span className="text-xs text-bone-faint">(theo dòng Trạng thái)</span>
            )}
          </label>
          <p className="mt-1 text-xs text-bone-faint">
            Chưa có ảnh thì thẻ chỉ hiện chữ cái đầu. Thường để nháp, thêm ảnh xong mới bật.
          </p>

          {error && (
            <div className="mt-4">
              <FormError>{error}</FormError>
            </div>
          )}

          <Button type="button" className="mt-5 w-full" disabled={!ready || pending} onClick={create}>
            {pending ? '…' : 'Tạo hồ sơ → thêm ảnh'}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setFull(true)}
          className="mt-4 text-xs uppercase tracking-[0.16em] text-bone-faint hover:text-gold"
        >
          Hoặc dùng form đầy đủ →
        </button>
      </aside>
    </div>
  );
}

const LEGEND: Array<[string, string]> = [
  ['Tên', 'bắt buộc'],
  ['Slug', 'đường dẫn, tự tạo từ tên nếu bỏ trống'],
  ['Chiều cao', '165, 1m65, 165cm'],
  ['Số đo', '86-60-90'],
  ['Khu vực', 'thành phố / quận'],
  ['Kinh nghiệm', 'số năm'],
  ['Thể loại', 'tên thể loại, cách nhau bằng dấu phẩy'],
  ['Giày · Tóc · Mắt', 'mục số đo'],
  ['Giới thiệu', 'nhiều dòng được'],
  ['Trạng thái', 'hiện / ẩn'],
  ['Khác', 'Cân nặng, Năm sinh, Giá… → chi tiết thêm'],
];

function describeValidation(fieldErrors?: Record<string, string[]>): string {
  const bad = Object.keys(fieldErrors ?? {});
  if (!bad.length) return 'Kiểm tra lại văn bản.';
  const names: Record<string, string> = {
    slug: 'Slug (chỉ a-z, số, gạch nối)',
    stage_name: 'Tên',
    height_cm: 'Chiều cao (120–230)',
    city: 'Khu vực',
    experience_years: 'Kinh nghiệm',
    details: 'Chi tiết thêm (mỗi ô tối đa 120 ký tự)',
    measurements: 'Số đo',
    category_ids: 'Thể loại',
  };
  return `Chưa lưu được — kiểm tra: ${bad.map((k) => names[k] ?? k).join(', ')}.`;
}
