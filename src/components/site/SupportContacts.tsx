'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { SupportContact } from '@/lib/telegram';
import { publicPhotoUrl } from '@/lib/storage';
import { trackBooking } from '@/lib/track';
import { cn } from '@/lib/cn';
import { TelegramIcon } from './TelegramIcon';

/**
 * The two support people, laid out three ways:
 *
 *   cards  — the closing section on the home page: room to breathe
 *   list   — a sidebar or footer block: one row per person
 *   inline — a row of small links for the mobile menu and the sticky bar
 *
 * A person is a name, an @username and a "message" action. The URL is never
 * printed: it is a link target, not content. Every link opens Telegram in a
 * new tab and fires the booking beacon, so the owner's click count covers
 * these as well as the button.
 */
export function SupportContacts({
  contacts,
  variant = 'list',
  modelId,
  className,
}: {
  contacts: SupportContact[];
  variant?: 'cards' | 'list' | 'inline';
  modelId?: string;
  className?: string;
}) {
  const t = useTranslations('support');
  const params = useParams();
  const locale = (params.locale as string) ?? 'vi';

  if (!contacts.length) return null;

  const onClick = () => trackBooking(modelId, locale);
  const nameOf = (c: SupportContact) => c.name || t('person', { n: c.n });

  /**
   * The avatar: an uploaded photo, else the first letter of the name. Names
   * here arrive in Unicode fancy-script ("𝓑𝓸𝓸𝓴𝓲𝓷𝓰", "ⓆⓉⓋ"); NFKC folds those
   * back to plain letters, and Array.from takes a whole code point rather
   * than half of a surrogate pair.
   */
  const initial = (c: SupportContact) =>
    (Array.from(nameOf(c).normalize('NFKC').trim())[0] ?? '').toUpperCase();
  const Avatar = ({ c, size }: { c: SupportContact; size: number }) =>
    c.avatarPath ? (
      <Image
        src={publicPhotoUrl(c.avatarPath)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    ) : (
      <>{initial(c)}</>
    );

  if (variant === 'cards') {
    return (
      <ul className={cn('grid gap-4 sm:grid-cols-2', className)}>
        {contacts.map((c) => (
          <li key={c.n}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className="group flex h-full flex-col gap-6 border border-line-strong bg-ink/60 p-6 text-left transition-colors duration-500 ease-lux hover:border-gold hover:bg-gold/5"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-surface-1 font-display text-2xl text-gold transition-colors group-hover:border-gold">
                  <Avatar c={c} size={56} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="kicker block text-[0.6rem]">{t('person', { n: c.n })}</span>
                  <span className="mt-1 block truncate font-display text-2xl text-bone transition-colors group-hover:text-gold">
                    {nameOf(c)}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-bone-dim">@{c.username}</span>
                </span>
              </span>
              <span className="btn-gold mt-auto inline-flex h-11 w-full items-center justify-center gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-ink">
                <TelegramIcon size={13} />
                {t('message')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (variant === 'inline') {
    return (
      <ul className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
        {contacts.map((c) => (
          <li key={c.n}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              title={`${nameOf(c)} · @${c.username}`}
              className="tap-safe inline-flex items-center gap-2 text-sm text-bone-dim transition-colors hover:text-gold"
            >
              <TelegramIcon size={14} className="text-gold" />
              <span className="text-bone">{nameOf(c)}</span>
              <span className="hidden text-xs text-bone-faint sm:inline">@{c.username}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn('divide-y divide-line border-y border-line', className)}>
      {contacts.map((c) => (
        <li key={c.n}>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className="group flex items-center gap-4 py-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-1 font-display text-base text-gold transition-colors group-hover:border-gold">
              <Avatar c={c} size={40} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-bone transition-colors group-hover:text-gold">
                {nameOf(c)}
              </span>
              <span className="mt-0.5 block truncate text-xs text-bone-faint">@{c.username}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 border border-line-strong px-2.5 py-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-bone-dim transition-colors group-hover:border-gold group-hover:text-gold">
              <TelegramIcon size={11} />
              {t('message')}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
