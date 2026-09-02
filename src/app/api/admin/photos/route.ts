import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';
import { getSiteSettings } from '@/lib/queries/public';
import { watermarkImage } from '@/lib/watermark';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 12 * 1024 * 1024;
const MAGIC: Array<{ sig: number[]; type: string }> = [
  { sig: [0xff, 0xd8, 0xff], type: 'jpeg' },
  { sig: [0x89, 0x50, 0x4e, 0x47], type: 'png' },
  { sig: [0x52, 0x49, 0x46, 0x46], type: 'webp' }, // RIFF....WEBP
];

function sniff(buf: Buffer): string | null {
  for (const { sig, type } of MAGIC) {
    if (sig.every((b, i) => buf[i] === b)) {
      if (type === 'webp' && buf.subarray(8, 12).toString() !== 'WEBP') continue;
      return type;
    }
  }
  return null;
}

/**
 * Staff-only image intake. Validates magic bytes, auto-orients (which drops
 * EXIF), downscales, re-encodes to WebP, uploads to the public bucket and
 * writes the model_photos row. The model_id is authorised via RLS on insert.
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff().catch(() => null);
  if (!staff || !staff.aal2) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const modelId = String(form.get('modelId') ?? '');
  if (!(file instanceof File) || !/^[0-9a-f-]{36}$/.test(modelId)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!sniff(input)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  let out: Buffer;
  let width = 0;
  let height = 0;
  try {
    const pipeline = sharp(input, { failOn: 'error' })
      .rotate() // bake orientation, strip EXIF
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    width = info.width;
    height = info.height;
    // Marked after the resize so the tile is sized against the stored image,
    // not the original a phone may have shot at 4000px.
    const { brand_name } = await getSiteSettings();
    out = await watermarkImage(data, brand_name);
  } catch {
    return NextResponse.json({ error: 'decode_failed' }, { status: 422 });
  }

  const path = `${modelId}/${crypto.randomUUID()}.webp`;
  const supabase = await createClient();

  const up = await supabase.storage
    .from('models-public')
    .upload(path, out, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 403 });
  }

  // place at the end of the current order
  const { data: last } = await supabase
    .from('model_photos')
    .select('sort_order')
    .eq('model_id', modelId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from('model_photos')
    .insert({
      model_id: modelId,
      storage_path: path,
      width,
      height,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from('models-public').remove([path]);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  await audit({
    actorId: staff.userId,
    action: 'model_photo.upload',
    entity: 'model_photos',
    entityId: row.id,
    meta: { modelId, width, height },
  });

  return NextResponse.json({ photo: row });
}
