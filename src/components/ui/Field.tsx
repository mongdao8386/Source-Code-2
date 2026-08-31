import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="kicker mb-2 block">
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full border border-line-strong bg-surface-1 px-3 text-sm text-bone',
        'placeholder:text-bone-faint focus:border-gold focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: ComponentPropsWithoutRef<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full border border-line-strong bg-surface-1 p-3 text-sm text-bone',
        'placeholder:text-bone-faint focus:border-gold focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: ComponentPropsWithoutRef<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full border border-line-strong bg-surface-1 px-3 text-sm text-bone',
        'focus:border-gold focus:outline-none',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="border-l-2 border-red-500/70 bg-red-500/5 px-3 py-2 text-sm text-red-300">
      {children}
    </p>
  );
}
