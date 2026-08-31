'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import type { Locale } from '@/i18n/routing';
import type { ModelPhoto } from '@/lib/supabase/types';
import { publicPhotoUrl } from '@/lib/storage';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

export function Gallery({
  photos,
  locale,
  name,
}: {
  photos: ModelPhoto[];
  locale: Locale;
  name: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
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

  if (!photos.length) return null;

  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 lg:gap-6 [&>*]:mb-4 lg:[&>*]:mb-6">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group block w-full overflow-hidden bg-surface-1"
            aria-label={`${name} — ${i + 1}`}
          >
            <Image
              src={publicPhotoUrl(p.storage_path)}
              alt={t(p.alt, locale) || `${name} ${i + 1}`}
              width={p.width ?? 800}
              height={p.height ?? 1000}
              sizes="(max-width: 768px) 50vw, 33vw"
              className="h-auto w-full transition-transform duration-700 ease-lux group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {open !== null && (
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
            aria-label="Close"
          >
            <span className="block h-px w-6 rotate-45 bg-current" />
            <span className="-mt-px block h-px w-6 -rotate-45 bg-current" />
          </button>
          {photos.length > 1 && (
            <>
              <NavArrow dir="left" onClick={(e) => { e.stopPropagation(); step(-1); }} />
              <NavArrow dir="right" onClick={(e) => { e.stopPropagation(); step(1); }} />
            </>
          )}
          <div className="relative max-h-[88vh] w-auto" onClick={(e) => e.stopPropagation()}>
            <Image
              src={publicPhotoUrl(photos[open]!.storage_path)}
              alt={t(photos[open]!.alt, locale) || name}
              width={photos[open]!.width ?? 1200}
              height={photos[open]!.height ?? 1600}
              className="max-h-[88vh] w-auto object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}

function NavArrow({
  dir,
  onClick,
}: {
  dir: 'left' | 'right';
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 p-4 text-bone-dim hover:text-bone',
        dir === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}
