'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Scroll-triggered reveal. `variant="mask"` wipes the child up from behind a
 * clipped edge — use it for display lines; "fade" is the general case.
 * prefers-reduced-motion neutralises the transition in globals.css.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = 'fade',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: 'fade' | 'mask';
  as?: 'div' | 'section' | 'li' | 'article' | 'span' | 'h1' | 'h2';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;

  if (variant === 'mask') {
    return (
      <As ref={ref as never} className={cn('line-mask', className)} data-shown={shown}>
        <span style={style}>{children}</span>
      </As>
    );
  }

  return (
    <As ref={ref as never} className={cn('reveal', className)} data-shown={shown} style={style}>
      {children}
    </As>
  );
}
