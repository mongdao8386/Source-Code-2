import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Hard cap, enforced here rather than in the browser.
 *
 * The trimmer also limits duration, but duration only exists as a number the
 * client reports — it is trivially forged. Bytes are the guard that actually
 * holds, and bytes are what cost money: video is served from Supabase Storage,
 * so every play counts against the project's egress allowance rather than the
 * VPS bandwidth.
 */
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const MAX_POSTER_BYTES = 4 * 1024 * 1024;
// Not exported: a route module may only export the handler names Next
// recognises, and anything else fails the build's route type check.
const MAX_DURATION_SECONDS = 15;

/**
 * ISO-BMFF (mp4) and WebM containers. mp4 puts an `ftyp` box at offset 4;
 * WebM/Matroska starts with the EBML magic.
 */
function sniffVideo(buf: Buffer): 'mp4' | 'webm' | null {
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') return 'mp4';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
  return null;
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff().catch(() => null);
  if (!staff || !staff.aal2) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const poster = form.get('poster');
  const modelId = String(form.get('modelId') ?? '');
  const duration = Number(form.get('duration') ?? 0);

  if (!(file instanceof File) || !/^[0-9a-f-]{36}$/.test(modelId)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffVideo(bytes);
  if (!kind) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const admin = createAdminClient();
  const stamp = crypto.randomUUID();
  const videoPath = `${modelId}/video-${stamp}.${kind}`;

  const up = await admin.storage.from('models-public').upload(videoPath, bytes, {
    contentType: kind === 'mp4' ? 'video/mp4' : 'video/webm',
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 403 });
  }

  // Poster frame, grabbed from the clip in the browser. Without one the grid
  // would have to fetch video bytes just to show a still.
  let posterPath = '';
  if (poster instanceof File && poster.size > 0 && poster.size <= MAX_POSTER_BYTES) {
    try {
      const webp = await sharp(Buffer.from(await poster.arrayBuffer()))
        .resize({ width: 1200, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      posterPath = `${modelId}/video-${stamp}-poster.webp`;
      const p = await admin.storage.from('models-public').upload(posterPath, webp, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
      if (p.error) posterPath = '';
    } catch {
      posterPath = '';
    }
  }

  // Written through the staff client so RLS still applies to the row itself.
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('models')
    .select('video_path, video_poster_path')
    .eq('id', modelId)
    .maybeSingle();

  const { error } = await supabase
    .from('models')
    .update({
      video_path: videoPath,
      video_poster_path: posterPath,
      video_duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      updated_by: staff.userId,
    })
    .eq('id', modelId);

  if (error) {
    await admin.storage.from('models-public').remove([videoPath, posterPath].filter(Boolean));
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  // Replacing a clip should not leave the old one paying for storage.
  const stale = [prev?.video_path, prev?.video_poster_path].filter(
    (p): p is string => !!p && p !== videoPath && p !== posterPath,
  );
  if (stale.length) await admin.storage.from('models-public').remove(stale);

  await audit({
    actorId: staff.userId,
    actorEmail: staff.email,
    action: 'model_video.upload',
    entity: 'models',
    entityId: modelId,
    meta: { bytes: file.size, kind, duration, capSeconds: MAX_DURATION_SECONDS },
  });

  return NextResponse.json({ videoPath, posterPath, duration });
}

export async function DELETE(request: NextRequest) {
  const staff = await requireStaff().catch(() => null);
  if (!staff || !staff.aal2) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 404 });
  }

  const modelId = new URL(request.url).searchParams.get('modelId') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(modelId)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('models')
    .select('video_path, video_poster_path')
    .eq('id', modelId)
    .maybeSingle();

  const { error } = await supabase
    .from('models')
    .update({ video_path: '', video_poster_path: '', video_duration: null })
    .eq('id', modelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const paths = [prev?.video_path, prev?.video_poster_path].filter(
    (p): p is string => !!p,
  );
  if (paths.length) {
    await createAdminClient().storage.from('models-public').remove(paths);
  }

  await audit({
    actorId: staff.userId,
    actorEmail: staff.email,
    action: 'model_video.delete',
    entity: 'models',
    entityId: modelId,
  });

  return NextResponse.json({ ok: true });
}
