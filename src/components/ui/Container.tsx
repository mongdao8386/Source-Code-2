import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Page gutter. Uses .gutter-safe rather than fixed padding so that in
 * landscape — where the notch moves to one side — the content clears it
 * instead of sliding underneath.
 */
export function Container({
  as: As = 'div',
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <As className={cn('gutter-safe mx-auto w-full max-w-[82rem]', className)}>
      {children}
    </As>
  );
}
