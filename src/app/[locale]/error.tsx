'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

const COPY = {
  vi: { title: 'Đã có lỗi xảy ra', body: 'Vui lòng thử lại sau ít phút.', retry: 'Thử lại' },
  en: { title: 'Something went wrong', body: 'Please try again in a few minutes.', retry: 'Try again' },
} as const;

// Kept translation-free: an error boundary can render before the intl context
// is established, which would otherwise throw MISSING_MESSAGE.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as 'vi' | 'en') ?? 'vi';
  const c = COPY[locale] ?? COPY.vi;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="kicker">500</p>
      <h1 className="mt-4 font-display text-4xl text-bone">{c.title}</h1>
      <p className="mt-3 text-sm text-bone-dim">{c.body}</p>
      <Button variant="outline" className="mt-8" onClick={reset}>
        {c.retry}
      </Button>
    </Container>
  );
}
