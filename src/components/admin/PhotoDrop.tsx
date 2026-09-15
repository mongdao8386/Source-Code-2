'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Photos for a model that does not exist yet.
 *
 * PhotoUploader needs a model id to post to; this holds the files until the
 * quick-add page has created one, then hands them over. Three ways in, all
 * of which end in the same list: drop, pick, or paste — Ctrl+V straight from
 * an image copied in Telegram, which is where these photos usually are.
 *
 * The first photo in the list becomes the cover. Everything the upload API
 * would refuse (HEIC, anything over 12 MB) is refused here first, with a
 * message, instead of after a wait.
 */

export const PHOTO_MAX_BYTES = 12 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;
const MAX_FILES = 30;
const OK_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OK_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const VIDEO_EXT = /\.(mp4|m4v|webm)$/i;

export const isVideoFile = (f: File) => VIDEO_TYPES.has(f.type) || VIDEO_EXT.test(f.name);

/** Why a file cannot go in, or null when it can. */
export function rejectReason(file: File, allowVideo = false): string | null {
  if (isVideoFile(file)) {
    if (!allowVideo) return 'Chỗ này chỉ nhận ảnh.';
    if (file.size > VIDEO_MAX_BYTES) return 'Video quá 40 MB.';
    return null;
  }
  const typed = file.type ? OK_TYPES.has(file.type) : OK_EXT.test(file.name);
  if (!typed) {
    return /\.heic$|\.heif$|image\/hei[cf]/i.test(file.name + file.type)
      ? 'HEIC (iPhone) chưa nhận — đổi sang JPEG, hoặc gửi ảnh qua Telegram rồi lưu lại.'
      : allowVideo
        ? 'Chỉ nhận JPEG, PNG, WebP, MP4 hoặc WebM.'
        : 'Chỉ nhận JPEG, PNG hoặc WebP.';
  }
  if (file.size > PHOTO_MAX_BYTES) return 'Quá 12 MB.';
  return null;
}

const key = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

export function PhotoDrop({
  files,
  onChange,
  disabled = false,
  allowVideo = false,
  firstIsCover = true,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** Also take mp4/webm clips (feedback), not just photos. */
  allowVideo?: boolean;
  /** Label the first file as the cover and offer "make cover" on the rest. */
  firstIsCover?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  // One object URL per file, released when the file leaves the list.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function add(incoming: Iterable<File>) {
    if (disabled) return;
    const have = new Set(files.map(key));
    const next = [...files];
    const said: string[] = [];
    for (const f of incoming) {
      if (have.has(key(f))) continue;
      const why = rejectReason(f, allowVideo);
      if (why) {
        said.push(`${f.name}: ${why}`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        said.push(`Tối đa ${MAX_FILES} ảnh một lần.`);
        break;
      }
      next.push(f);
      have.add(key(f));
    }
    setNotes(said);
    if (next.length !== files.length) onChange(next);
  }

  // Ctrl+V anywhere on the page. Only image files are taken, so pasting
  // text into the profile box is unaffected.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (imgs.length) add(imgs);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, disabled]);

  const remove = (i: number) => onChange(files.filter((_, j) => j !== i));
  const makeCover = (i: number) => onChange([files[i]!, ...files.filter((_, j) => j !== i)]);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          'border border-dashed px-4 py-6 text-center transition-colors',
          over ? 'border-gold bg-gold/5' : 'border-line-strong',
          disabled && 'opacity-50',
        )}
      >
        <input
          ref={input}
          type="file"
          accept={allowVideo ? 'image/jpeg,image/png,image/webp,video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            add(e.target.files ?? []);
            e.target.value = '';
          }}
        />
        <p className="text-sm text-bone-dim">
          Kéo ảnh vào đây, <span className="text-bone">Ctrl+V</span> dán ảnh vừa copy, hoặc
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          Chọn ảnh
        </Button>
        <p className="mt-3 text-xs text-bone-faint">
          {allowVideo
            ? 'JPEG/PNG/WebP tối đa 12 MB, video MP4/WebM tối đa 40 MB.'
            : 'JPEG/PNG/WebP, tối đa 12 MB mỗi ảnh. Tự nén WebP và xoá EXIF khi tải.'}
        </p>
      </div>

      {notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-300/90">
          {notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {files.map((f, i) => (
            <li
              key={key(f)}
              className="group relative aspect-[4/5] overflow-hidden border border-line bg-surface-1"
            >
              {isVideoFile(f) ? (
                <video src={previews[i]} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previews[i]} alt="" className="h-full w-full object-cover" />
              )}
              {firstIsCover && i === 0 && (
                <span className="absolute left-1 top-1 bg-gold px-1.5 py-0.5 text-[0.6rem] uppercase text-ink">
                  bìa
                </span>
              )}
              {!disabled && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-ink/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {firstIsCover && i > 0 ? (
                    <button
                      type="button"
                      onClick={() => makeCover(i)}
                      className="text-[0.6rem] uppercase text-bone-dim hover:text-gold"
                    >
                      làm bìa
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-[0.6rem] uppercase text-red-400"
                  >
                    bỏ
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
