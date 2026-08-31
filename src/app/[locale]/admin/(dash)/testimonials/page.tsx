import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { listTestimonials } from '@/lib/queries/admin';
import { TestimonialsClient } from './TestimonialsClient';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const [t, items] = await Promise.all([
    getTranslations('admin'),
    listTestimonials(),
  ]);
  return (
    <>
      <PageHeader title={t('nav.testimonials')} />
      <TestimonialsClient items={items} />
    </>
  );
}
