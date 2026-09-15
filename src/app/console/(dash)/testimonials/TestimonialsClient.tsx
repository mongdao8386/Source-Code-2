'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { FeedbackItem, FeedbackMedia } from '@/lib/feedback';
import { readFeedbackMedia, readRating } from '@/lib/feedback';
import { publicPhotoUrl } from '@/lib/storage';
import { deleteTestimonialAction, upsertTestimonialAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea, FormError } from '@/components/ui/Field';
import { TranslateButton } from '@/components/admin/TranslateButton';
import { PhotoDrop } from '@/components/admin/PhotoDrop';
import { cn } from '@/lib/cn';

/**
 * Feedback: customer reviews, posted by staff from what arrives on Telegram.
 *
 * Same shape as adding a model: the text on the left, screenshots or a clip
 * dropped in (or pasted with Ctrl+V), one button. Media is uploaded when the
 * button is pressed, not before, so an abandoned form leaves nothing in the
 * bucket. Editing loads a review back into the form; its existing media
 * shows as removable thumbnails above the drop box.
 */
const bag = (v: unknown): { vi?: string; en?: string } =>
  v && typeof v === 'object' ? (v as { vi?: string; en?: string }) : {};

const UPLOAD_ERRORS: Record<string, string> = {
  too_large: 'quá 12 MB (ảnh) / 40 MB (video)',
  unsupported_type: 'không phải JPEG/PNG/WebP/MP4/WebM',
  decode_failed: 'ảnh lỗi, không đọc được',
  unauthorized: 'phiên đăng nhập đã hết hạn',
};

type Draft = {
  id?: string;
  model_id: string;
  author: string;
  is_anonymous: boolean;
  role: string;
  vi: string;
  en: string;
  rating: number;
  is_published: boolean;
  media: FeedbackMedia[];
};
const empty: Draft = {
  model_id: '',
  author: '',
  is_anonymous: false,
  role: '',
  vi: '',
  en: '',
  rating: 5,
  is_published: true,
  media: [],
};

export function TestimonialsClient({
  items,
  models,
}: {
  items: FeedbackItem[];
  models: Array<{ id: string; stage_name: string }>;
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(empty);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  function edit(item: FeedbackItem) {
    setErr(null);
    setFiles([]);
    setD({
      id: item.id,
      model_id: item.model_id ?? '',
      author: item.author,
      is_anonymous: item.is_anonymous,
      role: item.role ?? '',
      vi: bag(item.quote).vi ?? '',
      en: bag(item.quote).en ?? '',
      rating: readRating(item.rating) ?? 5,
      is_published: item.is_published,
      media: readFeedbackMedia(item.media),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadOne(file: File): Promise<FeedbackMedia | string> {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/feedback-media', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return UPLOAD_ERRORS[json.error] ?? json.error ?? `lỗi ${res.status}`;
      return json.media as FeedbackMedia;
    } catch {
      return 'không gọi được máy chủ';
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);

    const media = [...d.media];
    for (let i = 0; i < files.length; i++) {
      setBusy(`Đang tải ${i + 1}/${files.length}…`);
      const out = await uploadOne(files[i]!);
      if (typeof out === 'string') {
        setBusy(null);
        setErr(`${files[i]!.name}: ${out}`);
        return;
      }
      media.push(out);
    }

    setBusy('Đang lưu…');
    const res = await upsertTestimonialAction({
      id: d.id,
      model_id: d.model_id || null,
      author: d.author,
      is_anonymous: d.is_anonymous,
      role: d.role || null,
      quote: { vi: d.vi, en: d.en },
      rating: d.rating,
      is_published: d.is_published,
      sort_order: 0,
      media,
    });
    setBusy(null);
    if (!res.ok) {
      setErr(res.error === 'validation' ? 'Kiểm tra lại các ô (tên khách bắt buộc).' : res.error);
      return;
    }
    setD(empty);
    setFiles([]);
    router.refresh();
  }

  async function togglePublished(item: FeedbackItem) {
    setBusy('…');
    const res = await upsertTestimonialAction({
      id: item.id,
      model_id: item.model_id,
      author: item.author,
      is_anonymous: item.is_anonymous,
      role: item.role,
      quote: bag(item.quote),
      rating: readRating(item.rating),
      is_published: !item.is_published,
      sort_order: item.sort_order,
      media: readFeedbackMedia(item.media),
    });
    setBusy(null);
    if (!res.ok) setErr(res.error);
    router.refresh();
  }

  async function remove(item: FeedbackItem) {
    if (!confirm(`Xoá feedback của ${item.is_anonymous ? 'khách ẩn danh' : item.author}? Ảnh/video kèm theo cũng bị xoá.`)) return;
    setBusy('…');
    const res = await deleteTestimonialAction({ id: item.id });
    setBusy(null);
    if (!res.ok) setErr(res.error);
    if (d.id === item.id) setD(empty);
    router.refresh();
  }

  const modelName = (id: string | null) => models.find((m) => m.id === id)?.stage_name;

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="grid gap-6 border border-line p-5 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="kicker">{d.id ? 'Sửa feedback' : 'Đăng feedback mới'}</p>
            {d.id && (
              <button
                type="button"
                onClick={() => {
                  setD(empty);
                  setFiles([]);
                }}
                className="text-xs uppercase tracking-[0.16em] text-bone-dim hover:text-gold"
              >
                Huỷ sửa
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="fa">Tên khách</Label>
                <label className="flex items-center gap-2 text-xs text-bone-dim">
                  <input
                    type="checkbox"
                    checked={d.is_anonymous}
                    onChange={(e) => set({ is_anonymous: e.target.checked })}
                  />
                  Khách muốn ẩn danh
                </label>
              </div>
              <Input
                id="fa"
                value={d.is_anonymous ? '' : d.author}
                disabled={d.is_anonymous}
                required={!d.is_anonymous}
                maxLength={120}
                placeholder={d.is_anonymous ? 'Sẽ hiện là “Khách ẩn danh”' : 'Anh Minh, Khách Q1…'}
                onChange={(e) => set({ author: e.target.value })}
              />
              {d.is_anonymous && (
                <p className="mt-1 text-xs text-bone-faint">
                  Không lưu tên thật. Ghi chú ngắn vẫn hiện, nên đừng ghi tên vào đó.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="fr">Ghi chú ngắn</Label>
              <Input
                id="fr"
                value={d.role}
                maxLength={120}
                placeholder="Khách quen, Quận 7…"
                onChange={(e) => set({ role: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fm">Về người mẫu</Label>
              <Select id="fm" value={d.model_id} onChange={(e) => set({ model_id: e.target.value })}>
                <option value="">— Không gắn —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.stage_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Đánh giá</Label>
              <div className="flex h-11 items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set({ rating: n })}
                    aria-label={`${n} sao`}
                    className={cn(
                      'text-2xl leading-none transition-colors',
                      n <= d.rating ? 'text-gold' : 'text-bone-faint/40 hover:text-bone-faint',
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="fv">Nội dung (VI)</Label>
              <Textarea
                id="fv"
                rows={5}
                value={d.vi}
                placeholder="Dán lời khách nhắn…"
                onChange={(e) => set({ vi: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="fe">Nội dung (EN)</Label>
                <TranslateButton source={d.vi} target={d.en} onResult={(en) => set({ en })} />
              </div>
              <Textarea id="fe" rows={5} value={d.en} onChange={(e) => set({ en: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-bone-dim">
            <input
              type="checkbox"
              checked={d.is_published}
              onChange={(e) => set({ is_published: e.target.checked })}
            />
            Hiện lên site
          </label>

          {err && <FormError>{err}</FormError>}

          <Button type="submit" disabled={!!busy || (!d.is_anonymous && !d.author.trim())}>
            {busy ?? (d.id ? 'Lưu thay đổi' : 'Đăng feedback')}
          </Button>
        </div>

        <div>
          <p className="kicker mb-3">Ảnh chụp màn hình / video</p>
          {d.media.length > 0 && (
            <ul className="mb-3 grid grid-cols-3 gap-2">
              {d.media.map((m) => (
                <li key={m.path} className="group relative aspect-[4/5] overflow-hidden border border-line bg-surface-1">
                  {m.kind === 'video' ? (
                    <video src={publicPhotoUrl(m.path)} muted preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <Image src={publicPhotoUrl(m.path)} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  )}
                  <button
                    type="button"
                    onClick={() => set({ media: d.media.filter((x) => x.path !== m.path) })}
                    className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-[0.6rem] uppercase text-red-400 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    bỏ
                  </button>
                </li>
              ))}
            </ul>
          )}
          <PhotoDrop files={files} onChange={setFiles} disabled={!!busy} allowVideo firstIsCover={false} />
        </div>
      </form>

      <ul className="divide-y divide-line border-y border-line">
        {items.length === 0 && <li className="py-6 text-sm text-bone-faint">Chưa có feedback nào.</li>}
        {items.map((item) => {
          const media = readFeedbackMedia(item.media);
          const rating = readRating(item.rating);
          return (
            <li key={item.id} className="flex flex-wrap items-start gap-4 py-4">
              <div className="flex shrink-0 gap-1">
                {media.slice(0, 3).map((m) => (
                  <span key={m.path} className="relative block h-16 w-12 overflow-hidden bg-surface-1">
                    {m.kind === 'video' ? (
                      <span className="flex h-full items-center justify-center text-[0.6rem] uppercase text-bone-faint">
                        video
                      </span>
                    ) : (
                      <Image src={publicPhotoUrl(m.path)} alt="" fill sizes="48px" className="object-cover" unoptimized />
                    )}
                  </span>
                ))}
                {media.length === 0 && (
                  <span className="flex h-16 w-12 items-center justify-center bg-surface-1 font-display text-lg text-bone-faint">
                    {item.is_anonymous ? '?' : item.author.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-bone">
                  {item.is_anonymous ? <span className="text-bone-dim">Khách ẩn danh</span> : item.author}
                  {rating && <span className="ml-2 text-gold">{'★'.repeat(rating)}</span>}
                  {modelName(item.model_id) && (
                    <span className="ml-2 text-xs text-bone-dim">· về {modelName(item.model_id)}</span>
                  )}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-bone-dim">{bag(item.quote).vi || bag(item.quote).en}</p>
                <p className="mt-1 text-xs text-bone-faint">
                  {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  {media.length > 0 && ` · ${media.length} tệp`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs uppercase tracking-[0.14em]">
                <span className={item.is_published ? 'text-gold' : 'text-bone-faint'}>
                  {item.is_published ? 'Hiện' : 'Ẩn'}
                </span>
                <button type="button" onClick={() => togglePublished(item)} className="text-bone-dim hover:text-gold">
                  {item.is_published ? 'Ẩn đi' : 'Hiện'}
                </button>
                <button type="button" onClick={() => edit(item)} className="text-bone-dim hover:text-gold">
                  Sửa
                </button>
                <button type="button" onClick={() => remove(item)} className="text-red-400 hover:text-red-300">
                  Xoá
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
