'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { buttonClass } from '@/components/ui/Button';

/**
 * The single conversion action. Opens the shared Telegram channel in a new
 * tab and fires a PII-free click beacon so the owner can see demand.
 */
export function BookingButton({
  telegramUrl,
  modelId,
  size = 'lg',
  variant = 'solid',
  className,
  label,
}: {
  telegramUrl: string;
  modelId?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline';
  className?: string;
  label?: string;
}) {
  const tr = useTranslations('booking');
  const params = useParams();
  const locale = (params.locale as string) ?? 'vi';
  const disabled = !telegramUrl;

  function handleClick() {
    // fire-and-forget; never blocks navigation
    void fetch('/api/track/booking', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ modelId: modelId ?? null, locale }),
      keepalive: true,
    }).catch(() => {});
  }

  if (disabled) {
    return (
      <span
        className={cn(buttonClass(variant, size), 'cursor-not-allowed opacity-40', className)}
        aria-disabled
      >
        {tr('comingSoon')}
      </span>
    );
  }

  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={tr('opensTelegram')}
      className={cn(buttonClass(variant, size), className)}
    >
      {label ?? tr('cta')}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 17 17 7M17 7H8M17 7v9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
    </a>
  );
}
