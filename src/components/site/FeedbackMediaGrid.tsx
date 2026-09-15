'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { FeedbackMedia } from '@/lib/feedback';
import { publicPhotoUrl } from '@/lib/storage';
import { cn } from '@/lib/cn';

/**
 * The screenshots and clips on a review. Images open in a lightbox, clips
 * play inline and only fetch metadata until pressed — video is served from
 * storage and bills egress. Both carry the watermark overlay like every
 * other frame on the site.
 */
export function FeedbackMediaGrid({ media, alt }: { media: FeedbackMedia[]; alt: string }) {
  const t = useTranslations('gallery');
  const [open, setOpen] = useState<number | null>(null);
  const images = media.filter((m) => m.kind === 'image');

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? i : (i + dir + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, step]);

  if (!media.length) return null;

  const cols = media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <>
      <ul className={cn('mt-4 grid gap-2', cols)}>
        {media.map((m, i) => {
          const src = publicPhotoUrl(m.path);
          if (m.kind === 'video') {
            return (
              <li
                key={m.path}
                className={cn(
                  'wm relative overflow-hidden bg-surface-1',
                  media.length === 1 ? 'aspect-video' : 'aspect-[4/5]',
                )}
              >
                <video
                  src={src}
                  controls
                  preload="metadata"
                  playsInline
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="h-full w-full object-cover"
                />
              </li>
            );
          }
          const idx = images.indexOf(m);
          return (
            <li key={m.path}>
              <button
                type="button"
                onClick={() => setOpen(idx)}
                aria-label={`${alt} · ${t('photo', { n: i + 1 })}`}
                className={cn(
                  'wm group relative block w-full overflow-hidden bg-surface-1',
                  media.length === 1 ? 'max-h-[32rem]' : 'aspect-[4/5]',
                )}
              >
                {media.length === 1 ? (
                  <Image
                    src={src}
                    alt={alt}
                    width={m.width ?? 800}
                    height={m.height ?? 1000}
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="h-auto max-h-[32rem] w-full object-contain object-left"
                  />
                ) : (
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-lux group-hover:scale-[1.03]"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open !== null && images[open] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4"
          onClick={close}
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-5 top-5 p-2 text-bone-dim hover:text-bone"
            aria-label={t('close')}
          >
            <span className="block h-px w-6 rotate-45 bg-current" />
            <span className="-mt-px block h-px w-6 -rotate-45 bg-current" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t('prev')}
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-4 text-bone-dim hover:text-bone"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={t('next')}
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-4 text-bone-dim hover:text-bone"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </>
          )}
          <div className="wm relative max-h-[88vh] w-auto" onClick={(e) => e.stopPropagation()}>
            <Image
              src={publicPhotoUrl(images[open]!.path)}
              alt={alt}
              width={images[open]!.width ?? 1200}
              height={images[open]!.height ?? 1600}
              className="max-h-[88vh] w-auto object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
