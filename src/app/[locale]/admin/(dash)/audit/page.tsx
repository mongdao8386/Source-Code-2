import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { listAudit } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const [t, rows] = await Promise.all([getTranslations('admin'), listAudit(200)]);

  return (
    <>
      <PageHeader title={t('nav.audit')} description="200 dòng gần nhất." />
      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left [&>th]:px-4 [&>th]:py-3">
              <th className="kicker">Time</th>
              <th className="kicker">Actor</th>
              <th className="kicker">Action</th>
              <th className="kicker">Entity</th>
              <th className="kicker">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <td className="px-4 py-2 tabular-nums text-bone-faint">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-bone-dim">
                  {r.actor_email ?? r.actor_id?.slice(0, 8) ?? '—'}
                </td>
                <td className="px-4 py-2 text-gold">{r.action}</td>
                <td className="px-4 py-2 text-bone-dim">
                  {r.entity}
                  {r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}
                </td>
                <td className="px-4 py-2 text-bone-faint">{r.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
