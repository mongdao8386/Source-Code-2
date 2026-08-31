import Link from 'next/link';
import { Container } from '@/components/ui/Container';

// Rendered for unmatched routes and explicit notFound() calls inside a locale.
// Kept translation-free so it also works when notFound() fires before the
// intl context is established (e.g. an unknown locale segment).
export default function LocaleNotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="kicker">404</p>
      <h1 className="mt-4 font-display text-4xl text-bone">
        Không tìm thấy trang
        <span className="mt-1 block text-xl text-bone-dim">Page not found</span>
      </h1>
      <Link
        href="/"
        className="mt-8 border border-line-strong px-6 py-3 text-xs uppercase tracking-[0.2em] text-bone-dim hover:border-gold hover:text-gold"
      >
        Trang chủ / Home
      </Link>
    </Container>
  );
}
