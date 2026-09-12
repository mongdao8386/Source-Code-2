/**
 * The two Telegram channels, read the same way everywhere.
 *
 * Support on this site is Telegram and nothing else: channel 1 takes the
 * bookings, channel 2 is the way in when the first is busy or blocked. This
 * module is the one place that decides which is which, so the header, the
 * model page, the footer and the floating button cannot drift apart.
 *
 * Client-safe: no server imports, so the CMS form can show a handle preview
 * from the same code that renders it on the public site.
 */

export type TelegramChannel = {
  /** 1 or 2 — the position in settings, which is also the display order. */
  n: 1 | 2;
  url: string;
  /** "@handle" derived from the URL, or '' when it cannot be read. */
  handle: string;
};

type Settings = { telegram_channel_url: string; telegram_support_url: string };

/** `https://t.me/some_channel` → `@some_channel`. Anything unreadable → ''. */
export function telegramHandle(url: string): string {
  const v = (url ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (!/(^|\.)(t\.me|telegram\.me|telegram\.dog)$/i.test(u.hostname)) return '';
    // t.me/+invite and t.me/joinchat/… are invite links with no public handle.
    const seg = u.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!seg || seg.startsWith('+') || seg === 'joinchat') return '';
    return `@${seg}`;
  } catch {
    return '';
  }
}

/** The channels that are actually set, in order — 0, 1 or 2 of them. */
export function supportChannels(settings: Settings): TelegramChannel[] {
  const out: TelegramChannel[] = [];
  const one = (settings.telegram_channel_url ?? '').trim();
  const two = (settings.telegram_support_url ?? '').trim();
  if (one) out.push({ n: 1, url: one, handle: telegramHandle(one) });
  if (two) out.push({ n: 2, url: two, handle: telegramHandle(two) });
  return out;
}

/** What the booking button opens: channel 1, else channel 2, else nothing. */
export function primaryTelegram(settings: Settings): string {
  return supportChannels(settings)[0]?.url ?? '';
}
