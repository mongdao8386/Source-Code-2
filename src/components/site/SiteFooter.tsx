import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const year = new Date().getFullYear();

  const links = [
    { href: '/models', label: nav('models') },
    { href: '/about', label: nav('about') },
    { href: '/guide', label: nav('guide') },
    { href: '/terms', label: nav('terms') },
  ] as const;

  return (
    <footer className="mt-28 border-t border-line md:mt-40">
      {/* Oversized wordmark — the closing beat, matching the hero's scale. */}
      <Container className="py-16 md:py-24">
        <p className="text-mega leading-[0.8] tracking-[-0.05em] text-surface-2">
          STUDIO<span className="text-gold/30">.</span>
        </p>
      </Container>

      <Container className="pad-safe-bottom flex flex-col gap-8 border-t border-line py-8 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="tap-safe link-wipe text-[0.6875rem] uppercase tracking-[0.22em] text-bone-dim hover:text-bone"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1 text-[0.6875rem] uppercase tracking-[0.18em] text-bone-faint md:items-end">
          <span>{t('built')}</span>
          <span>
            &copy; {year} Studio. {t('rights')}
          </span>
        </div>
      </Container>
    </footer>
  );
}
