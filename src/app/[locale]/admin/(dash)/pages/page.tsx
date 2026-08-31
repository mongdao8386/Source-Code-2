import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { listPages } from '@/lib/queries/admin';
import { PagesClient } from './PagesClient';

export const dynamic = 'force-dynamic';

export default async function PagesAdminPage() {
  const [t, pages] = await Promise.all([getTranslations('admin'), listPages()]);
  return (
    <>
      <PageHeader title={t('nav.pages')} description="Về chúng tôi · Điều khoản · Hướng dẫn" />
      <PagesClient pages={pages} />
    </>
  );
}
