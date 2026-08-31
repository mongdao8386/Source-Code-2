import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  modelId: z.string().uuid().nullable().optional(),
  locale: z.enum(['vi', 'en']).optional(),
});

// Anonymous, PII-free beacon for "Đặt lịch" clicks.
export async function POST(request: NextRequest) {
  // This is an unauthenticated insert, so cap it per IP — otherwise anyone can
  // pad click_events and skew the owner's numbers.
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const limit = await rateLimit(`track:${ip}`, 30, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSec) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase.from('click_events').insert({
    kind: 'booking',
    model_id: parsed.modelId ?? null,
    locale: parsed.locale ?? null,
  });

  return NextResponse.json({ ok: true });
}
