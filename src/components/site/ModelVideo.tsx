'use client';

import { useState } from 'react';
import Image from 'next/image';
import { publicPhotoUrl } from '@/lib/storage';

/**
 * Intro clip on a model profile.
 *
 * Nothing is fetched until the viewer asks for it: `preload="none"` and the
 * <video> element is not even mounted until the poster is clicked. Video is
 * served from Supabase Storage, so every autoplay would bill against the
 * project's egress allowance — a grid of clips playing on load would burn
 * through it in a few thousand page views.
 */
export function ModelVideo({
  videoPath,
  posterPath,
  name,
  label,
}: {
  videoPath: string;
  posterPath: string;
  name: string;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (!videoPath) return null;

  const poster = posterPath ? publicPhotoUrl(posterPath) : '';

  return (
    <figure className="mb-6">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-1">
        {playing ? (
          <video
            src={publicPhotoUrl(videoPath)}
            poster={poster || undefined}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={`${label} — ${name}`}
          >
            {poster ? (
              <Image
                src={poster}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 ease-lux group-hover:scale-[1.03]"
              />
            ) : (
              <span className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_35%,#1b1b21,#131317)]" />
            )}
            <span className="absolute inset-0 bg-ink/25 transition-colors group-hover:bg-ink/10" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bone/70 bg-ink/40 backdrop-blur-sm transition-transform duration-500 ease-lux group-hover:scale-110">
              <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden>
                <path d="M0 0l18 10L0 20V0z" fill="currentColor" className="text-bone" />
              </svg>
            </span>
            <span className="kicker absolute bottom-3 left-3 text-bone">{label}</span>
          </button>
        )}
      </div>
    </figure>
  );
}
