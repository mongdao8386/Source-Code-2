import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;

/** Per-asset output rules. Logos keep transparency; OG images are filled. */
const KINDS = {
  logo: { w: 900, h: 300, fit: 'inside' as const, format: 'webp' as const },
  favicon: { w: 256, h: 256, fit: 'cover' as const, format: 'png' as const },
  og: { w: 1200, h: 630, fit: 'cover' as const, format: 'webp' as const },
};
type Kind = keyof typeof KINDS;

const MAGIC: Array<{ sig: number[]; label: string }> = [
  { sig: [0xff, 0xd8, 0xff], label: 'jpeg' },
  { sig: [0x89, 0x50, 0x4e, 0x47], label: 'png' },
  { sig: [0x52, 0x49, 0x46, 0x46], label: 'webp' },
  { sig: [0x3c, 0x73, 0x76, 0x67], label: 'svg' },
  { sig: [0x3c, 0x3f, 0x78, 0x6d], label: 'svg' },
];

function sniff(buf: Buffer): string | null {
  for (const { sig, label } of MAGIC) {
    if (sig.every((b, i) => buf[i] === b)) {
      if (label === 'webp' && buf.subarray(8, 12).toString() !== 'WEBP') continue;
      return label;
    }
  }
  return null;
}

/**
 * Brand asset intake. Separate from /api/admin/photos, which is bound to a
 * model row; these are singletons on site_settings.
 *
 * SVG is accepted but rasterised rather than stored as-is: an SVG is a
 * document that can carry script, and it would be served from the same origin
 * as the CMS.
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff().catch(() => null);
  if (!staff || !staff.aal2) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const kind = String(form.get('kind') ?? '') as Kind;

  if (!(file instanceof File) || !(kind in KINDS)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const spec = KINDS[kind];
  let out: Buffer;
  try {
    const pipeline = sharp(input, { failOn: 'error' })
      .rotate()
      .resize({
        width: spec.w,
        height: spec.h,
        fit: spec.fit,
        withoutEnlargement: spec.fit === 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    out =
      spec.format === 'png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.webp({ quality: 90 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'decode_failed' }, { status: 422 });
  }

  const path = `brand/${kind}-${crypto.randomUUID()}.${spec.format}`;
  const admin = createAdminClient();

  const up = await admin.storage.from('models-public').upload(path, out, {
    contentType: spec.format === 'png' ? 'image/png' : 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 403 });
  }

  await audit({
    actorId: staff.userId,
    actorEmail: staff.email,
    action: 'brand.upload',
    entity: 'site_settings',
    meta: { kind, path },
  });

  return NextResponse.json({ path });
}
