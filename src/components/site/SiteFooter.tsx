import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-32 border-t border-line py-14">
      <Container className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl text-bone">
            STUDIO<span className="text-gold">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-bone-dim">{t('built')}</p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.18em] text-bone-dim">
          <Link href="/models" className="hover:text-bone">
            {nav('models')}
          </Link>
          <Link href="/about" className="hover:text-bone">
            {nav('about')}
          </Link>
          <Link href="/guide" className="hover:text-bone">
            {nav('guide')}
          </Link>
          <Link href="/terms" className="hover:text-bone">
            {nav('terms')}
          </Link>
        </nav>

        <p className="text-xs text-bone-faint">
          © {year} Studio. {t('rights')}
        </p>
      </Container>
    </footer>
  );
}
