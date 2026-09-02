'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicPhotoUrl } from '@/lib/storage';
import { Button } from '@/components/ui/Button';

const MAX_SECONDS = 15;

/** Must track @ffmpeg/core in package.json — a mismatched core fails to load. */
const CORE_VERSION = '0.12.10';
const MAX_BYTES = 8 * 1024 * 1024;

type Phase = 'idle' | 'picked' | 'loading-core' | 'trimming' | 'uploading';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}

/**
 * Trims a clip in the browser and uploads only the result.
 *
 * The work happens client-side on purpose: the VPS has two cores, and
 * transcoding there would tie up the web server for the length of every
 * upload. ffmpeg.wasm moves that cost onto the machine doing the editing.
 *
 * "Suggest" is arithmetic, not scene detection — it measures the source and
 * proposes a window that fits the cap. There is no reliable way to pick a
 * meaningful moment in-browser, so it does not pretend to.
 */
export function VideoTrimmer({
  girlId,
  videoPath,
  posterPath,
  duration,
}: {
  girlId: string;
  videoPath: string;
  posterPath: string;
  duration: number | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string>('');
  const [srcDuration, setSrcDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<import('@ffmpeg/ffmpeg').FFmpeg | null>(null);

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
    };
  }, [srcUrl]);

  function pick(f: File | undefined) {
    if (!f) return;
    setErr(null);
    setNote(null);
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setSrcUrl(url);
    setPhase('picked');
  }

  function onMeta() {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const d = v.duration;
    setSrcDuration(d);

    const suggestedEnd = Math.min(d, MAX_SECONDS);
    setStart(0);
    setEnd(suggestedEnd);
    setNote(
      d > MAX_SECONDS
        ? `Video dài ${fmt(d)} — đã đề xuất cắt ${fmt(0)}–${fmt(suggestedEnd)} cho vừa giới hạn ${MAX_SECONDS}s. Kéo để đổi đoạn.`
        : `Video dài ${fmt(d)}, đã trong giới hạn. Vẫn cắt lại để nén nhỏ hơn.`,
    );
  }

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
  }, []);

  async function grabPoster(): Promise<Blob | null> {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    v.currentTime = start;
    await new Promise((r) => {
      const on = () => {
        v.removeEventListener('seeked', on);
        r(null);
      };
      v.addEventListener('seeked', on);
      setTimeout(() => r(null), 2000);
    });
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    return new Promise((r) => canvas.toBlob((b) => r(b), 'image/jpeg', 0.85));
  }

  async function getFfmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    setPhase('loading-core');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ff = new FFmpeg();
    ff.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)));

    // The core is ~32 MB and the box serves it at roughly 50 KB/s — a quarter
    // of an hour before a single frame is trimmed, measured, with the VPS
    // sitting at 2% CPU the whole time. The same bytes come off jsDelivr about
    // fifteen times faster.
    //
    // copy-ffmpeg.mjs still puts a same-origin copy in public/, and that is
    // what runs if the CDN is unreachable — the original objection to a CDN
    // was depending on a third party's uptime, and a fallback answers it
    // without leaving the editor unusable in the meantime.
    try {
      const base = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch {
      await ff.load({
        coreURL: '/ffmpeg/ffmpeg-core.js',
        wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      });
    }

    ffmpegRef.current = ff;
    return ff;
  }

  async function run() {
    if (!file) return;
    setErr(null);
    setProgress(0);

    const span = end - start;
    if (span <= 0) return setErr('Đoạn cắt không hợp lệ.');
    if (span > MAX_SECONDS + 0.2) {
      return setErr(`Đoạn cắt tối đa ${MAX_SECONDS} giây.`);
    }

    try {
      const poster = await grabPoster();
      const ff = await getFfmpeg();
      setPhase('trimming');

      const { fetchFile } = await import('@ffmpeg/util');
      const inName = 'in' + (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp4');
      await ff.writeFile(inName, await fetchFile(file));

      await ff.exec([
        '-ss', start.toFixed(2),
        '-t', span.toFixed(2),
        '-i', inName,
        '-vf', "scale='min(720,iw)':-2",
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '30',
        '-maxrate', '2M',
        '-bufsize', '4M',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        '-y', 'out.mp4',
      ]);

      const out = await ff.readFile('out.mp4');
      const blob = new Blob([out as BlobPart], { type: 'video/mp4' });
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile('out.mp4').catch(() => {});

      if (blob.size > MAX_BYTES) {
        setPhase('picked');
        return setErr(
          `Sau khi nén vẫn ${(blob.size / 1048576).toFixed(1)} MB, vượt ${MAX_BYTES / 1048576} MB. Cắt ngắn hơn rồi thử lại.`,
        );
      }

      setPhase('uploading');
      const fd = new FormData();
      fd.append('file', new File([blob], 'clip.mp4', { type: 'video/mp4' }));
      if (poster) fd.append('poster', new File([poster], 'poster.jpg', { type: 'image/jpeg' }));
      // Field name is the API's, not this component's: /api/admin/videos reads
      // `modelId` and writes the `model_id` column. Renaming the prop is local;
      // renaming the wire would need the route and the schema to move too.
      fd.append('modelId', girlId);
      fd.append('duration', String(span));

      const res = await fetch('/api/admin/videos', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setPhase('picked');
        return setErr(json.error ?? 'upload_failed');
      }

      setFile(null);
      setSrcUrl('');
      setPhase('idle');
      setNote(null);
      router.refresh();
    } catch (e) {
      setPhase('picked');
      setErr(e instanceof Error ? e.message : 'Cắt video thất bại.');
    }
  }

  async function remove() {
    if (!confirm('Xoá video của gái này?')) return;
    const res = await fetch(`/api/admin/videos?modelId=${girlId}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else setErr('Xoá thất bại.');
  }

  const busy = phase === 'loading-core' || phase === 'trimming' || phase === 'uploading';
  const span = Math.max(0, end - start);

  return (
    <div className="space-y-4">
      {videoPath ? (
        <div className="flex flex-wrap items-start gap-4 border border-line p-3">
          <video
            src={publicPhotoUrl(videoPath)}
            poster={posterPath ? publicPhotoUrl(posterPath) : undefined}
            controls
            playsInline
            preload="none"
            className="max-h-56 w-auto bg-ink"
          />
          <div className="text-xs text-bone-dim">
            <p>Đang dùng {duration ? `· ${duration.toFixed(1)}s` : ''}</p>
            <Button type="button" size="sm" variant="ghost" className="mt-2 text-red-400" onClick={remove}>
              Xoá video
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-bone-faint">Chưa có video.</p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
          {videoPath ? 'Thay video' : 'Chọn video'}
        </Button>
        <span className="text-xs text-bone-faint">
          Tối đa {MAX_SECONDS}s · {MAX_BYTES / 1048576} MB sau khi nén · cắt ngay trên trình duyệt
        </span>
      </div>

      {srcUrl && (
        <div className="space-y-3 border border-line p-3">
          <video
            ref={videoRef}
            src={srcUrl}
            onLoadedMetadata={onMeta}
            controls
            playsInline
            muted
            className="max-h-64 w-auto bg-ink"
          />

          {note && <p className="text-xs text-gold">{note}</p>}

          {srcDuration > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-bone-dim">
                <label className="w-12 shrink-0">Bắt đầu</label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, srcDuration - 0.5)}
                  step={0.1}
                  value={start}
                  disabled={busy}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStart(v);
                    if (end - v > MAX_SECONDS) setEnd(v + MAX_SECONDS);
                    if (end <= v) setEnd(Math.min(srcDuration, v + 1));
                    seek(v);
                  }}
                  className="flex-1 accent-[var(--color-gold)]"
                />
                <span className="w-12 shrink-0 tabular-nums">{fmt(start)}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-bone-dim">
                <label className="w-12 shrink-0">Kết thúc</label>
                <input
                  type="range"
                  min={0}
                  max={srcDuration}
                  step={0.1}
                  value={end}
                  disabled={busy}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setEnd(v);
                    if (v - start > MAX_SECONDS) setStart(v - MAX_SECONDS);
                    seek(v);
                  }}
                  className="flex-1 accent-[var(--color-gold)]"
                />
                <span className="w-12 shrink-0 tabular-nums">{fmt(end)}</span>
              </div>

              <p className="text-xs">
                <span className={span > MAX_SECONDS ? 'text-red-300' : 'text-bone-dim'}>
                  Độ dài đoạn cắt: {span.toFixed(1)}s / {MAX_SECONDS}s
                </span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" disabled={busy || span <= 0} onClick={run}>
              {phase === 'loading-core'
                ? 'Đang tải bộ mã hoá…'
                : phase === 'trimming'
                  ? `Đang cắt ${progress}%`
                  : phase === 'uploading'
                    ? 'Đang tải lên…'
                    : 'Cắt và tải lên'}
            </Button>
            {phase === 'loading-core' && (
              <span className="text-xs text-bone-faint">
                Lần đầu tải ~32 MB bộ mã hoá, các lần sau dùng cache.
              </span>
            )}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}