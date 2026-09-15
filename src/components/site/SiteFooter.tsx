import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { Brand } from '@/components/site/Brand';
import { SupportContacts } from '@/components/site/SupportContacts';
import { getSiteSettings } from '@/lib/queries/public';
import { supportContacts } from '@/lib/telegram';

export async function SiteFooter() {
  const [t, nav, support, settings] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
    getTranslations('support'),
    getSiteSettings(),
  ]);
  const year = new Date().getFullYear();
  const contacts = supportContacts(settings);

  const links = [
    { href: '/models', label: nav('models') },
    { href: '/feedback', label: nav('feedback') },
    { href: '/about', label: nav('about') },
    { href: '/guide', label: nav('guide') },
    { href: '/terms', label: nav('terms') },
  ] as const;

  return (
    <footer className="mt-28 border-t border-line md:mt-40">
      {/* Oversized wordmark — the closing beat, matching the hero's scale. */}
      <Container className="py-16 md:py-24">
        <p className="text-mega leading-[0.8] tracking-[-0.05em] text-surface-2">
          <Brand name={settings.brand_name} dotClassName="text-gold/30" />
        </p>
      </Container>

      <Container className="grid gap-12 border-t border-line py-12 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-16">
        <div>
          <p className="kicker">{settings.brand_name}</p>
          <nav className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
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
        </div>

        {contacts.length > 0 && (
          <div>
            <p className="kicker text-gold">{t('support')}</p>
            <p className="mt-2 text-xs leading-relaxed text-bone-faint">{support('body')}</p>
            <SupportContacts contacts={contacts} variant="list" className="mt-4" />
          </div>
        )}
      </Container>

      <Container className="pad-safe-bottom flex flex-col gap-2 border-t border-line py-6 text-[0.6875rem] uppercase tracking-[0.18em] text-bone-faint md:flex-row md:items-center md:justify-between">
        <span>{t('built')}</span>
        <span>
          &copy; {year} {settings.brand_name}. {t('rights')}
        </span>
      </Container>
    </footer>
  );
}
