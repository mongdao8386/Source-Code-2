import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { CMS_LOCALE, adminHref } from '@/lib/admin-path';
import { PageHeader } from '@/components/admin/PageHeader';
import { buttonClass } from '@/components/ui/Button';
import { listModels } from '@/lib/queries/admin';
import { publicPhotoUrl } from '@/lib/storage';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

export default async function ModelsListPage() {
  const [t, models] = await Promise.all([getTranslations('admin'), listModels()]);
  const published = models.filter((m) => m.status === 'published').length;

  return (
    <>
      <PageHeader
        title={t('nav.models')}
        description={
          models.length
            ? `${models.length} hồ sơ · ${published} đang hiện · ${models.length - published} nháp`
            : undefined
        }
        action={
          <Link href={adminHref('/models/new')} className={buttonClass('solid', 'sm')}>
            + Thêm người mẫu
          </Link>
        }
      />

      {models.length === 0 ? (
        <div className="border border-line p-10 text-center">
          <p className="font-display text-2xl text-bone">Chưa có hồ sơ nào</p>
          <p className="mt-2 text-sm text-bone-dim">
            Dán hồ sơ theo mẫu là xong — chưa đến một phút.
          </p>
          <Link
            href={adminHref('/models/new')}
            className={cn(buttonClass('solid', 'md'), 'mt-6')}
          >
            + Thêm người mẫu
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {models.map((m) => (
            <li key={m.id}>
              <div className="flex items-center gap-4 py-3 transition-colors hover:bg-surface-1/60 sm:gap-5">
                <Link
                  href={adminHref(`/models/${m.id}`)}
                  className="relative block h-16 w-12 shrink-0 overflow-hidden bg-surface-1 sm:h-20 sm:w-[3.75rem]"
                >
                  {m.cover_path ? (
                    <Image
                      src={publicPhotoUrl(m.cover_path)}
                      alt=""
                      fill
                      sizes="60px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-display text-xl text-bone-faint">
                      {m.stage_name.charAt(0)}
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={adminHref(`/models/${m.id}`)}
                    className="block truncate font-display text-lg text-bone hover:text-gold"
                  >
                    {m.stage_name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-bone-faint">
                    <span className="truncate">/{m.slug}</span>
                    {m.city && <span>{m.city}</span>}
                    {m.height_cm && <span>{m.height_cm} cm</span>}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right text-xs tabular-nums text-bone-faint sm:block">
                  <p>{m.photo_count} ảnh</p>
                  <p className="mt-0.5">thứ tự {m.display_order}</p>
                </div>

                <span
                  className={cn(
                    'shrink-0 border px-2 py-1 text-[0.625rem] uppercase tracking-[0.16em]',
                    m.status === 'published'
                      ? 'border-gold/60 text-gold'
                      : 'border-line-strong text-bone-faint',
                  )}
                >
                  {m.status === 'published' ? 'Hiện' : 'Nháp'}
                </span>

                {m.status === 'published' && (
                  <a
                    href={`/${CMS_LOCALE}/nguoi-mau/${m.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden shrink-0 text-xs uppercase tracking-[0.16em] text-bone-dim hover:text-gold sm:block"
                  >
                    Xem ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
