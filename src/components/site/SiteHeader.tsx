'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/site/LocaleSwitch';
import { BookingButton } from '@/components/site/BookingButton';
import { Brand } from '@/components/site/Brand';
import { cn } from '@/lib/cn';

const links = [
  { href: '/models', key: 'models' },
  { href: '/about', key: 'about' },
  { href: '/guide', key: 'guide' },
] as const;

export function SiteHeader({
  telegramUrl,
  brandName,
  logoPath,
}: {
  telegramUrl: string;
  brandName: string;
  logoPath: string;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the hero, solid once past it — keeps the full-bleed
  // opening uninterrupted without losing legibility on scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'pad-safe-top fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-lux',
        scrolled || open
          ? 'border-b border-line bg-ink/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="gutter-safe mx-auto flex h-16 w-full max-w-[82rem] items-center justify-between">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-display text-xl leading-none tracking-tight text-bone"
        >
          <Brand name={brandName} logoPath={logoPath} logoHeight={26} />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'link-wipe text-[0.6875rem] uppercase tracking-[0.22em] transition-colors',
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
          className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label={open ? t('close') : t('menu')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={cn(
              'block h-px w-6 bg-bone transition-transform duration-400 ease-lux',
              open && 'translate-y-[3.5px] rotate-45',
            )}
          />
          <span
            className={cn(
              'block h-px w-6 bg-bone transition-transform duration-400 ease-lux',
              open && '-translate-y-[3.5px] -rotate-45',
            )}
          />
        </button>
      </div>

      {/* Full-screen mobile menu with oversized type. */}
      <div
        className={cn(
          'top-below-header fixed inset-x-0 bottom-0 bg-ink transition-all duration-500 ease-lux md:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <div className="gutter-safe flex h-full flex-col justify-between overflow-y-auto pt-8 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-5 font-display text-4xl text-bone"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-10 flex items-center justify-between">
            <LocaleSwitch />
            <BookingButton telegramUrl={telegramUrl} label={t('book')} />
          </div>
        </div>
      </div>
    </header>
  );
}
