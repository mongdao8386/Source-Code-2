import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { listModelNames, listTestimonials } from '@/lib/queries/admin';
import { TestimonialsClient } from './TestimonialsClient';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const [t, items, models] = await Promise.all([
    getTranslations('admin'),
    listTestimonials(),
    listModelNames(),
  ]);
  return (
    <>
      <PageHeader
        title={t('nav.testimonials')}
        description="Đăng review của khách kèm ảnh chụp màn hình hoặc video. Mới nhất hiện trước."
      />
      <TestimonialsClient items={items} models={models} />
    </>
  );
}
