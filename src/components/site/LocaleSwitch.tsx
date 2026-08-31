'use client';

import { useParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

export function LocaleSwitch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();
  const current = (params.locale as string) ?? routing.defaultLocale;

  return (
    <div className={cn('flex items-center gap-1 text-xs tracking-widest', className)}>
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center gap-1">
          {i > 0 && <span className="text-bone-faint">/</span>}
          <button
            type="button"
            disabled={pending || loc === current}
            onClick={() =>
              startTransition(() => {
                // @ts-expect-error pathname is a valid route for this app
                router.replace(pathname, { locale: loc });
              })
            }
            className={cn(
              'uppercase transition-colors',
              loc === current ? 'text-gold' : 'text-bone-dim hover:text-bone',
            )}
          >
            {loc}
          </button>
        </span>
      ))}
    </div>
  );
}
