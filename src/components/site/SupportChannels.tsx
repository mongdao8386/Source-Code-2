'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { TelegramChannel } from '@/lib/telegram';
import { trackBooking } from '@/lib/track';
import { cn } from '@/lib/cn';
import { TelegramIcon } from './TelegramIcon';

/**
 * The two Telegram channels, laid out three ways:
 *
 *   cards  — the closing section on the home page: big handle, room to breathe
 *   list   — a sidebar or footer block: one row per channel
 *   inline — a row of small links for the mobile menu and the sticky bar
 *
 * Every link is a real anchor in a new tab and fires the booking beacon, so
 * the owner's click count covers the support links as well as the button.
 */
export function SupportChannels({
  channels,
  variant = 'list',
  modelId,
  className,
}: {
  channels: TelegramChannel[];
  variant?: 'cards' | 'list' | 'inline';
  modelId?: string;
  className?: string;
}) {
  const t = useTranslations('support');
  const params = useParams();
  const locale = (params.locale as string) ?? 'vi';

  if (!channels.length) return null;

  const onClick = () => trackBooking(modelId, locale);
  const role = (c: TelegramChannel) => (c.n === 1 ? t('primary') : t('backup'));

  if (variant === 'cards') {
    return (
      <ul className={cn('grid gap-4 sm:grid-cols-2', className)}>
        {channels.map((c) => (
          <li key={c.n}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className="group flex h-full flex-col justify-between border border-line-strong bg-ink/60 p-6 text-left transition-colors duration-500 ease-lux hover:border-gold hover:bg-gold/5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="kicker">
                  {t('channel', { n: c.n })} · {role(c)}
                </span>
                <TelegramIcon size={18} className="text-gold" />
              </div>
              <span className="mt-8 block truncate font-display text-2xl text-bone transition-colors group-hover:text-gold md:text-3xl">
                {c.handle || c.url.replace(/^https?:\/\//, '')}
              </span>
              <span className="link-wipe mt-6 inline-block self-start text-[0.6875rem] uppercase tracking-[0.22em] text-bone-dim group-hover:text-bone">
                {t('open')} &#8599;
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
        {channels.map((c) => (
          <li key={c.n}>
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              title={`${t('channel', { n: c.n })} · ${role(c)}`}
              className="tap-safe inline-flex items-center gap-2 text-sm text-bone-dim transition-colors hover:text-gold"
            >
              <TelegramIcon size={14} className="text-gold" />
              {c.handle || t('channel', { n: c.n })}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn('divide-y divide-line border-y border-line', className)}>
      {channels.map((c) => (
        <li key={c.n}>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className="group flex items-center gap-4 py-3.5 transition-colors hover:text-gold"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-gold transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
              <TelegramIcon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-bone transition-colors group-hover:text-gold">
                {c.handle || c.url.replace(/^https?:\/\//, '')}
              </span>
              <span className="kicker mt-0.5 block text-[0.6rem]">
                {t('channel', { n: c.n })} · {role(c)}
              </span>
            </span>
            <span className="ordinal transition-transform duration-500 ease-lux group-hover:translate-x-1">
              &#8599;
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
