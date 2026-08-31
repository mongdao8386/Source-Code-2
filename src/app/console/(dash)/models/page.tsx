import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { adminHref } from '@/lib/admin-path';
import { PageHeader } from '@/components/admin/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { listModels } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function ModelsListPage() {
  const [t, models] = await Promise.all([getTranslations('admin'), listModels()]);

  return (
    <>
      <PageHeader
        title={t('nav.models')}
        action={
          <Link href={adminHref('/models/new')} className={buttonClass('solid', 'sm')}>
            + New
          </Link>
        }
      />

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left [&>th]:px-4 [&>th]:py-3">
              <th className="kicker">Name</th>
              <th className="kicker">Slug</th>
              <th className="kicker">Status</th>
              <th className="kicker">Photos</th>
              <th className="kicker">Order</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-bone-faint">
                  —
                </td>
              </tr>
            )}
            {models.map((m) => (
              <tr key={m.id} className="border-b border-line/60 hover:bg-surface-1">
                <td className="px-4 py-3">
                  <Link
                    href={adminHref(`/models/${m.id}`)}
                    className="text-bone hover:text-gold"
                  >
                    {m.stage_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-bone-dim">{m.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      m.status === 'published' ? 'text-gold' : 'text-bone-faint'
                    }
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-bone-dim">{m.photo_count}</td>
                <td className="px-4 py-3 tabular-nums text-bone-dim">{m.display_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
