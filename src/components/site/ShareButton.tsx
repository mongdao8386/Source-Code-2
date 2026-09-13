'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/**
 * Share the page you are on.
 *
 * On a phone this opens the system share sheet, which is how a profile gets
 * from a visitor into a Telegram chat with a friend, or from the operator
 * into a channel. Elsewhere it copies the link and says so. Cancelling the
 * sheet is not an error, so nothing is reported for it.
 */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const t = useTranslations('models');
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* cancelled, or clipboard refused — the address bar still has the link */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        'tap-safe inline-flex items-center gap-2 border border-line-strong px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-bone-dim transition-colors hover:border-gold hover:text-gold',
        copied && 'border-gold text-gold',
        className,
      )}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
      {copied ? t('copied') : t('share')}
    </button>
  );
}
