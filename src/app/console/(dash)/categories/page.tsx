import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { listCategories } from '@/lib/queries/admin';
import { CategoriesClient } from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const [t, categories] = await Promise.all([
    getTranslations('admin'),
    listCategories(),
  ]);
  return (
    <>
      <PageHeader title={t('nav.categories')} />
      <CategoriesClient categories={categories} />
    </>
  );
}
