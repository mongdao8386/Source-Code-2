/**
 * A still from a video file, made in the browser before upload.
 *
 * The server has no ffmpeg, and a <video> with no poster is a black box on
 * iOS until it is played — which on a feedback card reads as "nothing
 * here". So the frame is grabbed here: decode a second in, draw to a
 * canvas, hand back a JPEG. Anything that cannot be decoded in this
 * browser (an odd codec) yields null and the clip goes up without one.
 */
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let settled = false;
    const done = (b: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      v.removeAttribute('src');
      resolve(b);
    };
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onerror = () => done(null);
    v.onloadedmetadata = () => {
      // A second in, or the middle of a very short clip.
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => {
      try {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (!w || !h) return done(null);
        const scale = Math.min(1, 1280 / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done(b), 'image/jpeg', 0.85);
      } catch {
        done(null);
      }
    };
    setTimeout(() => done(null), 10000);
    v.src = url;
  });
}
