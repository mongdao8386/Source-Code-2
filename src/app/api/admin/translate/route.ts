import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/guards';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * VI → EN for the bilingual CMS fields.
 *
 * The key stays here. DeepL bills per character against the account, so this
 * is staff-only at AAL2 like the rest of the CMS write surface — an open
 * endpoint would be someone else's translation budget.
 *
 * Deliberately not a server action: the editor calls it per field while
 * typing is done, and a plain fetch keeps that off the form submission path.
 */

const MAX_CHARS = 5000;

const schema = z.object({
  // A batch, so one row of the detail list costs one call rather than four.
  text: z.array(z.string().max(MAX_CHARS)).min(1).max(20),
  target: z.enum(['EN-GB', 'EN-US']).default('EN-GB'),
});

/** Free keys end in ':fx' and live on a different host to paid ones. */
function endpoint(key: string): string {
  const override = serverEnv().DEEPL_API_URL;
  if (override) return override;
  return key.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff().catch(() => null);
  if (!staff || !staff.aal2) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 404 });
  }

  const key = serverEnv().DEEPL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Blank entries would still be billed as a call; keep their slots so the
  // caller can zip the results back onto its fields by index.
  const { text, target } = parsed.data;
  const filled = text.map((t, i) => [i, t.trim()] as const).filter(([, t]) => t !== '');
  if (filled.length === 0) {
    return NextResponse.json({ translations: text.map(() => '') });
  }

  let res: Response;
  try {
    res = await fetch(endpoint(key), {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: filled.map(([, t]) => t),
        source_lang: 'VI',
        target_lang: target,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
  }

  if (!res.ok) {
    // Surface DeepL's own message rather than flattening it: quota exhausted,
    // a key that has no Vietnamese, and a typo'd key are three different
    // problems and the operator can only act on the difference.
    const detail = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'upstream_error', status: res.status, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const body = (await res.json().catch(() => null)) as {
    translations?: Array<{ text?: string }>;
  } | null;

  const got = body?.translations;
  if (!Array.isArray(got) || got.length !== filled.length) {
    return NextResponse.json({ error: 'upstream_malformed' }, { status: 502 });
  }

  const out = text.map(() => '');
  filled.forEach(([slot], n) => {
    out[slot] = got[n]?.text ?? '';
  });

  return NextResponse.json({ translations: out });
}
