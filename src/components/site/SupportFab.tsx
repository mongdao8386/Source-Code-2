'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, usePathname } from 'next/navigation';
import type { TelegramChannel } from '@/lib/telegram';
import { trackBooking } from '@/lib/track';
import { cn } from '@/lib/cn';
import { TelegramIcon } from './TelegramIcon';
import { SupportChannels } from './SupportChannels';

/**
 * The floating Telegram button, bottom-right on every page.
 *
 * One channel: the button is the link. Two: it opens a small sheet listing
 * both, so a visitor who is already scrolled deep into a board never has to
 * find their way back to a header or footer to get in touch.
 *
 * Model pages already pin a booking bar to the bottom of a phone screen, and
 * two things fighting for the same thumb is worse than one — so on those
 * pages it shows from `lg` up only. The pathname is matched against the
 * localised segments from i18n/routing.ts.
 */
const MODEL_PAGE = /^\/(vi|en)\/(nguoi-mau|models)\/[^/]+\/?$/;

export function SupportFab({ channels }: { channels: TelegramChannel[] }) {
  const t = useTranslations('support');
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) ?? 'vi';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // Any navigation closes the sheet.
  useEffect(() => setOpen(false), [pathname]);

  if (!channels.length) return null;

  const onModelPage = MODEL_PAGE.test(pathname);
  const button =
    'flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-[0_10px_30px_rgba(0,0,0,0.45)] ' +
    'transition-all duration-500 ease-lux hover:bg-gold-bright hover:scale-105 active:scale-95';

  return (
    <div
      ref={root}
      className={cn(
        'fixed right-4 z-40 flex-col items-end gap-3 md:right-6',
        'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
        onModelPage ? 'hidden lg:flex' : 'flex',
      )}
    >
      {channels.length > 1 && open && (
        <div
          role="dialog"
          aria-label={t('title')}
          className="w-[min(20rem,calc(100vw-2rem))] border border-line-strong bg-ink/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md"
        >
          <p className="kicker text-gold">{t('title')}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">{t('body')}</p>
          <SupportChannels channels={channels} variant="list" className="mt-3" />
        </div>
      )}

      {channels.length === 1 ? (
        <a
          href={channels[0]!.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackBooking(null, locale)}
          aria-label={t('fab')}
          title={t('fab')}
          className={button}
        >
          <TelegramIcon size={24} />
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t('close') : t('fab')}
          title={t('fab')}
          className={button}
        >
          {open ? (
            <span className="relative block h-5 w-5">
              <span className="absolute left-0 top-1/2 h-px w-5 rotate-45 bg-current" />
              <span className="absolute left-0 top-1/2 h-px w-5 -rotate-45 bg-current" />
            </span>
          ) : (
            <TelegramIcon size={24} />
          )}
        </button>
      )}
    </div>
  );
}
