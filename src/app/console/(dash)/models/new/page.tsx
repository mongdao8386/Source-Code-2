import { PageHeader } from '@/components/admin/PageHeader';
import { QuickAddModel } from '@/components/admin/QuickAddModel';
import { listCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function NewModelPage() {
  const categories = await listCategories();
  return (
    <>
      <PageHeader
        title="Thêm người mẫu"
        description="Dán hồ sơ theo mẫu, thả ảnh vào, bấm một nút là xong."
      />
      <QuickAddModel categories={categories} />
    </>
  );
}
