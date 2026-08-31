import { getTranslations } from 'next-intl/server';
import { requireOwner } from '@/lib/auth/guards';
import { PageHeader } from '@/components/admin/PageHeader';
import { listStaff } from '@/lib/queries/users';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const staff = await requireOwner(); // 404 for non-owners
  const [t, rows] = await Promise.all([getTranslations('admin'), listStaff()]);

  return (
    <>
      <PageHeader title={t('nav.users')} description="Chỉ owner mới thấy trang này." />
      <UsersClient staff={rows} selfId={staff.userId} />
    </>
  );
}
