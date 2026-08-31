import { PageHeader } from '@/components/admin/PageHeader';
import { ModelForm } from '@/components/admin/ModelForm';
import { listCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function NewModelPage() {
  const categories = await listCategories();
  return (
    <>
      <PageHeader title="New model" description="Tạo hồ sơ, lưu, rồi thêm ảnh." />
      <ModelForm model={null} categories={categories} />
    </>
  );
}
