'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CMS_LOCALE, adminHref } from '@/lib/admin-path';
import type { Category, ModelPhoto } from '@/lib/supabase/types';
import { MODEL_TEMPLATE, parseModelTemplate } from '@/lib/model-template';
import {
  createModelAction,
  setCoverAction,
  updateModelAction,
} from '@/app/console/(dash)/models/actions';
import { Button, buttonClass } from '@/components/ui/Button';
import { FormError, Textarea } from '@/components/ui/Field';
import { ModelForm } from './ModelForm';
import { PhotoDrop } from './PhotoDrop';
import { cn } from '@/lib/cn';

/**
 * New model = one paste, some photos, one button.
 *
 * The text is read as you type and the right-hand side shows what will be
 * saved. Photos go in the box under it — dropped, picked, or pasted from
 * Telegram — and the first one is the cover. The button then does the whole
 * sequence: create the profile, upload every photo, set the cover, and put
 * it live if there is at least one photo. What used to be three screens is
 * one, and adding the next model is a click away on the result panel.
 *
 * If a photo fails on the way, the profile is still there as a draft and
 * the result panel says which files to retry from the edit page.
 */
const catName = (c: Category) =>
  (c.name as { vi?: string; en?: string })?.vi ||
  (c.name as { vi?: string; en?: string })?.en ||
  c.slug;

const UPLOAD_ERRORS: Record<string, string> = {
  too_large: 'quá 12 MB',
  unsupported_type: 'không phải JPEG/PNG/WebP',
  decode_failed: 'ảnh lỗi, không đọc được',
  unauthorized: 'phiên đăng nhập đã hết hạn',
  bad_request: 'yêu cầu không hợp lệ',
};

type Phase =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'uploading'; done: number; total: number }
  | { kind: 'publishing' }
  | {
      kind: 'done';
      id: string;
      slug: string;
      name: string;
      published: boolean;
      uploaded: number;
      failed: string[];
    };

export function QuickAddModel({ categories }: { categories: Category[] }) {
  const [text, setText] = useState(MODEL_TEMPLATE);
  const [files, setFiles] = useState<File[]>([]);
  const [publishChoice, setPublishChoice] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const cats = useMemo(
    () => categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    [categories],
  );
  const parsed = useMemo(() => parseModelTemplate(text, cats), [text, cats]);
  const ready = parsed.stage_name.trim() !== '';
  const busy = phase.kind !== 'idle' && phase.kind !== 'done';

  // Live by default once there is a photo to show; a bare profile stays a
  // draft. A "Trạng thái" line in the text, or the box itself, overrides.
  const publish = parsed.status ? parsed.status === 'published' : (publishChoice ?? files.length > 0);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(MODEL_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the textarea already holds the template */
    }
  }

  function reset() {
    setText(MODEL_TEMPLATE);
    setFiles([]);
    setPublishChoice(null);
    setPhase({ kind: 'idle' });
    setError(null);
  }

  async function uploadOne(modelId: string, file: File): Promise<ModelPhoto | string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('modelId', modelId);
    try {
      const res = await fetch('/api/admin/photos', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return UPLOAD_ERRORS[json.error] ?? json.error ?? `lỗi ${res.status}`;
      return json.photo as ModelPhoto;
    } catch {
      return 'không gọi được máy chủ';
    }
  }

  async function create() {
    if (!ready || busy) return;
    setError(null);

    const payload = {
      slug: parsed.slug,
      stage_name: parsed.stage_name,
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
    };

    // Created as a draft whenever photos are coming, so the board never shows
    // a live card with a placeholder while the uploads are still in flight.
    setPhase({ kind: 'creating' });
    const created = await createModelAction({
      ...payload,
      status: publish && files.length === 0 ? 'published' : 'draft',
    });
    if (!created.ok) {
      setPhase({ kind: 'idle' });
      setError(
        created.error === 'validation'
          ? describeValidation(created.fieldErrors)
          : /duplicate|unique/i.test(created.error)
            ? `Slug “${parsed.slug}” đã có. Thêm dòng “Slug: ten-khac” vào văn bản.`
            : created.error,
      );
      return;
    }
    const id = (created.data as { id?: string })?.id;
    if (!id) {
      setPhase({ kind: 'idle' });
      setError('Đã tạo nhưng không nhận được mã hồ sơ. Kiểm tra danh sách.');
      return;
    }

    const uploaded: ModelPhoto[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setPhase({ kind: 'uploading', done: i, total: files.length });
      const out = await uploadOne(id, files[i]!);
      if (typeof out === 'string') failed.push(`${files[i]!.name}: ${out}`);
      else uploaded.push(out);
    }

    // The first photo that made it is the cover — the list order is the
    // operator's, and the first slot is labelled as such.
    if (uploaded[0]) {
      await setCoverAction({ modelId: id, photoId: uploaded[0].id });
    }

    let published = publish && files.length === 0;
    if (publish && files.length > 0 && uploaded.length > 0) {
      setPhase({ kind: 'publishing' });
      const res = await updateModelAction({ id, ...payload, status: 'published' });
      published = res.ok;
      if (!res.ok) failed.push(`Chưa bật hiện được: ${res.error}`);
    }

    setPhase({
      kind: 'done',
      id,
      slug: parsed.slug,
      name: parsed.stage_name,
      published,
      uploaded: uploaded.length,
      failed,
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

  if (phase.kind === 'done') {
    return (
      <div className="max-w-xl border border-line bg-surface-1/40 p-6">
        <p className="kicker text-gold">Đã tạo</p>
        <p className="mt-2 font-display text-3xl text-bone">{phase.name}</p>
        <p className="mt-2 text-sm text-bone-dim">
          {phase.uploaded} ảnh
          {' · '}
          {phase.published ? (
            <span className="text-gold">đang hiện trên site</span>
          ) : (
            'đang là bản nháp'
          )}
        </p>

        {phase.failed.length > 0 && (
          <div className="mt-4">
            <FormError>
              <span className="block">Có chỗ chưa xong, sửa ở trang hồ sơ:</span>
              {phase.failed.map((f) => (
                <span key={f} className="mt-1 block text-xs">
                  • {f}
                </span>
              ))}
            </FormError>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={reset}>
            + Thêm người mẫu khác
          </Button>
          <Link href={adminHref(`/models/${phase.id}`)} className={buttonClass('outline', 'md')}>
            Sửa hồ sơ / thêm video
          </Link>
          {phase.published && (
            <a
              href={`/${CMS_LOCALE}/nguoi-mau/${phase.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-[0.16em] text-bone-dim hover:text-gold"
            >
              Xem trên site ↗
            </a>
          )}
        </div>
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

  const buttonLabel =
    phase.kind === 'creating'
      ? 'Đang tạo hồ sơ…'
      : phase.kind === 'uploading'
        ? `Đang tải ảnh ${phase.done + 1}/${phase.total}…`
        : phase.kind === 'publishing'
          ? 'Đang bật hiện…'
          : files.length
            ? `Tạo hồ sơ + tải ${files.length} ảnh`
            : 'Tạo hồ sơ (chưa có ảnh)';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)]">
      {/* ── The paste, then the photos ─────────────────────────── */}
      <div className="space-y-8">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bone-dim">
              <span className="kicker mr-2 text-gold">1</span>
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
                disabled={text === MODEL_TEMPLATE || busy}
              >
                Xoá
              </Button>
            </div>
          </div>

          <Textarea
            rows={13}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            disabled={busy}
            className="mt-4 font-mono text-[13px] leading-relaxed"
            aria-label="Văn bản hồ sơ theo mẫu"
          />

          <details className="mt-3 text-xs text-bone-faint">
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
        </section>

        <section>
          <p className="mb-3 text-sm text-bone-dim">
            <span className="kicker mr-2 text-gold">2</span>
            Ảnh. Ảnh đầu tiên là ảnh bìa.
            {files.length > 0 && (
              <span className="ml-2 text-bone">{files.length} ảnh đã chọn</span>
            )}
          </p>
          <PhotoDrop files={files} onChange={setFiles} disabled={busy} />
        </section>
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

          <p className="mt-4 text-sm text-bone-dim">
            {files.length ? `${files.length} ảnh, ảnh đầu làm bìa` : 'Chưa có ảnh'}
          </p>

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
              checked={publish}
              disabled={parsed.status != null || busy}
              onChange={(e) => setPublishChoice(e.target.checked)}
            />
            Hiện lên site ngay
            {parsed.status && (
              <span className="text-xs text-bone-faint">(theo dòng Trạng thái)</span>
            )}
          </label>
          <p className="mt-1 text-xs text-bone-faint">
            {files.length
              ? 'Có ảnh nên mặc định hiện ngay sau khi tải xong.'
              : 'Chưa có ảnh thì thẻ chỉ hiện chữ cái đầu, nên mặc định để nháp.'}
          </p>

          {error && (
            <div className="mt-4">
              <FormError>{error}</FormError>
            </div>
          )}

          <Button
            type="button"
            className="mt-5 w-full"
            disabled={!ready || busy}
            onClick={create}
          >
            {buttonLabel}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setFull(true)}
          disabled={busy}
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
