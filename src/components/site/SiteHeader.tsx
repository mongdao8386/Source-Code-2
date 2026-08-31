'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/site/LocaleSwitch';
import { BookingButton } from '@/components/site/BookingButton';
import { cn } from '@/lib/cn';

const links = [
  { href: '/models', key: 'models' },
  { href: '/about', key: 'about' },
  { href: '/guide', key: 'guide' },
] as const;

export function SiteHeader({ telegramUrl }: { telegramUrl: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[82rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-bone"
          onClick={() => setOpen(false)}
        >
          STUDIO<span className="text-gold">.</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'text-xs uppercase tracking-[0.18em] transition-colors',
                pathname === l.href ? 'text-gold' : 'text-bone-dim hover:text-bone',
              )}
            >
              {t(l.key)}
            </Link>
          ))}
          <LocaleSwitch />
          <BookingButton telegramUrl={telegramUrl} size="sm" label={t('book')} />
        </nav>

        <button
          type="button"
          className="p-2 text-bone md:hidden"
          aria-label={open ? t('close') : t('menu')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-px w-6 bg-current" />
          <span className={cn('mt-1.5 block h-px w-6 bg-current transition-opacity', open && 'opacity-0')} />
          <span className="mt-1.5 block h-px w-6 bg-current" />
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-ink px-5 pb-8 pt-4 md:hidden">
          <div className="flex flex-col gap-5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.18em] text-bone-dim"
              >
                {t(l.key)}
              </Link>
            ))}
            <div className="flex items-center justify-between pt-2">
              <LocaleSwitch />
              <BookingButton telegramUrl={telegramUrl} size="sm" label={t('book')} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
