import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Media for a customer review: a chat screenshot or a short clip.
 *
 * Images go through the same pipeline as model photos — magic bytes, auto
 * orient (drops EXIF), 1600px cap, WebP. Video is stored as it came, mp4 or
 * WebM only, because a clip of someone's feedback is not worth a transcode
 * and the model-video route's 15-second trimmer is the wrong tool for it.
 * Everything lands under feedback/ in the public bucket; the row that
 * references it is written by the CMS action afterwards, and a path that
 * was never referenced is just an orphan, not a hole.
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

function sniff(buf: Buffer): 'jpeg' | 'png' | 'webp' | 'mp4' | 'webm' | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')
    return 'webp';
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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  const kind = sniff(input);
  if (!kind) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const storage = createAdminClient().storage.from('models-public');
  const id = crypto.randomUUID();

  if (kind === 'mp4' || kind === 'webm') {
    const path = `feedback/${id}.${kind}`;
    const up = await storage.upload(path, input, {
      contentType: kind === 'mp4' ? 'video/mp4' : 'video/webm',
      cacheControl: '31536000',
      upsert: false,
    });
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    await audit({
      actorId: staff.userId,
      action: 'feedback_media.upload',
      entity: 'testimonials',
      entityId: null,
      meta: { kind, path, bytes: file.size },
    }).catch(() => {});
    return NextResponse.json({ media: { kind: 'video', path } });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  let out: Buffer;
  let width = 0;
  let height = 0;
  try {
    const { data, info } = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    out = data;
    width = info.width;
    height = info.height;
  } catch {
    return NextResponse.json({ error: 'decode_failed' }, { status: 422 });
  }

  const path = `feedback/${id}.webp`;
  const up = await storage.upload(path, out, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  await audit({
    actorId: staff.userId,
    action: 'feedback_media.upload',
    entity: 'testimonials',
    entityId: null,
    meta: { kind: 'image', path, width, height },
  }).catch(() => {});

  return NextResponse.json({ media: { kind: 'image', path, width, height } });
}
