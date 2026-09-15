'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * Scroll-to-top, shown once the page has been scrolled a screen or so.
 *
 * Used on the public site and in the console; the caller positions it with
 * `className`. On the public site's model pages a booking bar already owns
 * the bottom of a phone screen, so `hideOnModelPageMobile` keeps this one
 * out of the way there until `lg`.
 */
const MODEL_PAGE = /^\/(vi|en)\/(nguoi-mau|models)\/[^/]+\/?$/;
const SHOW_AFTER_PX = 600;

export function BackToTop({
  label,
  className,
  hideOnModelPageMobile = false,
}: {
  label: string;
  className?: string;
  hideOnModelPageMobile?: boolean;
}) {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tucked = hideOnModelPageMobile && MODEL_PAGE.test(pathname);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={label}
      title={label}
      className={cn(
        'fixed z-40 h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-ink/85 text-bone-dim shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-500 ease-lux hover:border-gold hover:text-gold',
        tucked ? 'hidden lg:flex' : 'flex',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 19V6M6 12l6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" />
      </svg>
    </button>
  );
}
