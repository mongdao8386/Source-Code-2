import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { adminDashboard } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [t, d] = await Promise.all([getTranslations('admin'), adminDashboard()]);

  const stats: Array<[string, number]> = [
    ['Models · published', d.modelsPublished],
    ['Models · draft', d.modelsDraft],
    ['Photos', d.photos],
    ['Categories', d.categories],
    ['Testimonials', d.testimonials],
    ['Booking clicks · 30d', d.bookingClicks30d],
  ];

  return (
    <>
      <PageHeader title={t('nav.dashboard')} />

      <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-surface-1 p-5">
            <p className="kicker">{label}</p>
            <p className="mt-2 font-display text-3xl text-bone">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-lg text-bone">Recent activity</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
        {d.recentAudit.length === 0 && (
          <li className="py-3 text-bone-faint">—</li>
        )}
        {d.recentAudit.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-3 py-3">
            <span className="text-bone-faint tabular-nums">
              {new Date(row.created_at).toLocaleString()}
            </span>
            <span className="text-gold">{row.action}</span>
            <span className="text-bone-dim">
              {row.entity}
              {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
