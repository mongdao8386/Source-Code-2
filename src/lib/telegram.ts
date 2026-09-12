/**
 * Telegram, read the same way everywhere.
 *
 * Two different things live under this name:
 *
 *   - the booking channel: `site_settings.telegram_channel_url`, a private
 *     invite link the "Đặt lịch" button opens. Nothing about it is shown;
 *     an invite link is a string of noise.
 *   - support: up to two staff accounts in `site_settings.telegram_support`,
 *     each a display name and a username. These are rendered as a person —
 *     name, @username, a "message" button — and link to t.me/<username>.
 *
 * Client-safe: no server imports, so the CMS form and the public site share
 * the same normalisation and cannot disagree about what a username is.
 */

export type SupportContact = {
  /** 1 or 2 — the position in settings, which is also the display order. */
  n: 1 | 2;
  name: string;
  /** Without the "@". */
  username: string;
  url: string;
  /** Storage path of an uploaded avatar, or '' to fall back to the initial. */
  avatarPath: string;
};

/** Only objects this app uploaded — the same rule the CMS enforces on save. */
const UPLOADED = /^brand\/[a-z]+-[0-9a-f-]{36}\.(webp|png)$/;

/** Telegram's own rule: 5–32 of a-z, 0-9 and underscore. */
export const USERNAME_RE = /^[a-z][a-z0-9_]{4,31}$/i;

/**
 * "@Abc", "t.me/Abc", "https://t.me/Abc/" and "Abc" all mean the username
 * Abc. Anything else — an invite link, a phone number — comes back as it
 * came in, so validation can refuse it with the original in the message.
 */
export function normalizeUsername(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';
  const m = raw.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/([^/?#\s]+)\/?(?:[?#].*)?$/i,
  );
  const handle = (m ? m[1]! : raw).replace(/^@/, '');
  return handle;
}

export function usernameUrl(username: string): string {
  return `https://t.me/${username}`;
}

/** The support accounts that are actually set, in order — 0, 1 or 2 of them. */
export function supportContacts(settings: { telegram_support?: unknown }): SupportContact[] {
  const raw = settings.telegram_support;
  if (!Array.isArray(raw)) return [];
  const out: SupportContact[] = [];
  for (const item of raw.slice(0, 2)) {
    const o = (item ?? {}) as { name?: unknown; username?: unknown; avatar_path?: unknown };
    const username = normalizeUsername(typeof o.username === 'string' ? o.username : '');
    if (!USERNAME_RE.test(username)) continue;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    const avatar = typeof o.avatar_path === 'string' ? o.avatar_path.trim() : '';
    out.push({
      n: (out.length + 1) as 1 | 2,
      name,
      username,
      url: usernameUrl(username),
      avatarPath: UPLOADED.test(avatar) ? avatar : '',
    });
  }
  return out;
}
