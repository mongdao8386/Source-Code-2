'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ModelPhoto } from '@/lib/supabase/types';
import { publicPhotoUrl } from '@/lib/storage';
import {
  deletePhotoAction,
  reorderPhotosAction,
  setCoverAction,
} from '@/app/console/(dash)/models/actions';
import { Button } from '@/components/ui/Button';

export function PhotoUploader({
  modelId,
  photos: initial,
}: {
  modelId: string;
  photos: ModelPhoto[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();
  const dragId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Local state is optimistic, but `useState(initial)` ignores every later
  // server render — so after a revalidation the tiles on screen can describe a
  // list the database no longer has, and acting on a tile then hits a
  // different photo than the one clicked. Re-sync whenever the server's actual
  // contents change (identity alone is useless: the array is new every render).
  const serverSignature = initial
    .map((p) => `${p.id}:${p.sort_order}:${p.is_cover}`)
    .join(',');
  const [syncedSignature, setSyncedSignature] = useState(serverSignature);
  if (syncedSignature !== serverSignature) {
    setSyncedSignature(serverSignature);
    setPhotos(initial);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('modelId', modelId);
        const res = await fetch('/api/admin/photos', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) {
          setErr(json.error ?? 'upload_failed');
          break;
        }
        setPhotos((p) => [...p, json.photo as ModelPhoto]);
      }
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
      router.refresh();
    }
  }

  function onDrop(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;

    // Build the new order outside the updater. React may invoke a state
    // updater more than once, and a server call made inside one fires once per
    // invocation — a single drag was persisting several conflicting orders.
    const arr = [...photos];
    const fi = arr.findIndex((p) => p.id === from);
    const ti = arr.findIndex((p) => p.id === targetId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved!);

    setPhotos(arr);
    start(async () => {
      const res = await reorderPhotosAction({ modelId, order: arr.map((p) => p.id) });
      if (!res.ok) setErr(res.error);
      router.refresh();
    });
  }

  function makeCover(photoId: string) {
    start(async () => {
      const res = await setCoverAction({ modelId, photoId });
      if (!res.ok) return setErr(res.error);
      setPhotos((list) => list.map((p) => ({ ...p, is_cover: p.id === photoId })));
      router.refresh();
    });
  }

  function remove(photoId: string) {
    if (!confirm('Xoá ảnh này?')) return;
    start(async () => {
      const res = await deletePhotoAction({ photoId });
      if (!res.ok) return setErr(res.error);
      setPhotos((list) => list.filter((p) => p.id !== photoId));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
        <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Add photos'}
        </Button>
        <span className="text-xs text-bone-faint">
          JPEG/PNG/WebP · tự nén WebP, xoá EXIF, tối đa 2000px
        </span>
      </div>

      {err && <p className="text-sm text-red-300">{err}</p>}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <li
            key={p.id}
            draggable
            onDragStart={() => (dragId.current = p.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(p.id)}
            className="group relative aspect-[4/5] cursor-grab overflow-hidden border border-line bg-surface-1"
          >
            <Image
              src={publicPhotoUrl(p.storage_path)}
              alt=""
              fill
              sizes="20vw"
              className="object-cover"
              unoptimized
            />
            {p.is_cover && (
              <span className="absolute left-1 top-1 bg-gold px-1.5 py-0.5 text-[0.6rem] uppercase text-ink">
                cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-ink/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => makeCover(p.id)}
                className="text-[0.6rem] uppercase text-bone-dim hover:text-gold"
              >
                cover
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-[0.6rem] uppercase text-red-400"
              >
                del
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
