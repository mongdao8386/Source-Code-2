import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'solid' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group/btn inline-flex items-center justify-center gap-2.5 font-sans font-medium ' +
  'uppercase tracking-[0.18em] transition-all duration-500 ease-lux rounded-xs ' +
  'select-none disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  solid: 'bg-gold text-ink hover:bg-gold-bright active:translate-y-px',
  outline:
    'border border-line-strong text-bone hover:border-gold hover:text-gold ' +
    'hover:bg-gold/5',
  ghost: 'text-bone-dim hover:text-bone',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[0.625rem]',
  md: 'h-11 px-6 text-[0.6875rem]',
  lg: 'h-14 px-10 text-[0.75rem]',
};

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = 'solid',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function buttonClass(variant: Variant = 'solid', size: Size = 'md') {
  return cn(base, variants[variant], sizes[size]);
}
