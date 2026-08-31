import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
    <As className={cn('mx-auto w-full max-w-[82rem] px-5 sm:px-8 lg:px-12', className)}>
      {children}
    </As>
  );
}
