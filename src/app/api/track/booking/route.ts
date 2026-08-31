import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bodySchema = z.object({
  modelId: z.string().uuid().nullable().optional(),
  locale: z.enum(['vi', 'en']).optional(),
});

// Anonymous, PII-free beacon for "Đặt lịch" clicks.
export async function POST(request: NextRequest) {
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
