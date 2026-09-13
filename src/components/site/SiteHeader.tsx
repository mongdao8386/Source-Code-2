'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/site/LocaleSwitch';
import { BookingButton } from '@/components/site/BookingButton';
import { Brand } from '@/components/site/Brand';
import { SupportContacts } from '@/components/site/SupportContacts';
import type { SupportContact } from '@/lib/telegram';
import { cn } from '@/lib/cn';

const links = [
  { href: '/models', key: 'models' },
  { href: '/about', key: 'about' },
  { href: '/guide', key: 'guide' },
] as const;

export function SiteHeader({
  telegramUrl,
  contacts,
  brandName,
  logoPath,
}: {
  telegramUrl: string;
  contacts: SupportContact[];
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
        // No backdrop-filter while the menu is open. A filter makes the header
        // the containing block for its fixed descendants, and the menu panel
        // below is one: its `top` and `bottom` then resolve against a 64px
        // header instead of the viewport, giving it a height of zero and
        // leaving the page showing through where the menu should be.
        open
          ? 'border-b border-line bg-ink'
          : scrolled
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
          <Brand
            name={brandName}
            logoPath={logoPath}
            logoHeight={40}
            className="max-w-[160px] sm:max-w-[220px]"
          />
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
          {contacts.length > 0 && (
            <span className="flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-bone-dim">
              <span className="pulse-dot" aria-hidden />
              {t('online')}
            </span>
          )}
          <BookingButton telegramUrl={telegramUrl} size="sm" label={t('book')} />
        </nav>

        {/* On a phone the only booking button used to be inside the menu or
            the hero — one tap away from anywhere else on the page. */}
        <div className="flex items-center gap-2 md:hidden">
          <BookingButton telegramUrl={telegramUrl} size="sm" label={t('book')} />
          <button
          type="button"
          className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5"
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
      </div>

      {/*
        Full-screen mobile menu with oversized type.

        `hidden` rather than an invisible/opacity-0 class pair, because those
        are utilities in a stylesheet and a browser applies a stylesheet as it
        streams. On a slow enough connection there is a window where the type
        rules have landed and the hiding rules have not, and the menu paints
        over the page in full — reported from a phone, with the nav's "Models"
        sitting on top of the model's own name. `[hidden]` is a user-agent
        rule, so it holds before any CSS arrives at all.

        The cost is the 500ms cross-fade, which cannot run against display:
        none. A menu that is occasionally wrong is worse than one that opens
        plainly.
      */}
      <div
        hidden={!open}
        className="top-below-header fixed inset-x-0 bottom-0 bg-ink md:hidden"
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
          <div className="mt-10 space-y-6">
            <SupportContacts contacts={contacts} variant="inline" />
            <div className="flex items-center justify-between">
              <LocaleSwitch />
              <BookingButton telegramUrl={telegramUrl} label={t('book')} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
