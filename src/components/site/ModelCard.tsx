import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ModelListItem } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import { modelPrice } from '@/lib/model-facts';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

/** Published this recently and the tile says so. */
const NEW_FOR_DAYS = 14;

const NEW_LABEL: Record<Locale, string> = { vi: 'Mới', en: 'New' };
const VIEW_LABEL: Record<Locale, string> = { vi: 'Xem hồ sơ', en: 'View profile' };

export function isNewModel(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const age = Date.now() - new Date(publishedAt).getTime();
  return age >= 0 && age < NEW_FOR_DAYS * 864e5;
}

/**
 * Portrait tile for the boards. 3:4 to match how agencies crop — taller
 * frames read as fashion, squarer ones as stock.
 *
 * Everything a visitor compares is on the tile: price on the image, height
 * and area under the name, the category as a gold tag. Nothing waits for a
 * hover, because on a phone there is none.
 */
export function ModelCard({
  model,
  locale,
  index,
  priority = false,
  className,
  tag,
}: {
  model: ModelListItem;
  locale: Locale;
  index?: number;
  priority?: boolean;
  className?: string;
  /** A category name to show with the meta, e.g. the model's first one. */
  tag?: string;
}) {
  const src = model.cover ? publicPhotoUrl(model.cover.storage_path) : '';
  const alt = model.cover ? t(model.cover.alt, locale) || model.stage_name : model.stage_name;

  const meta = [model.height_cm ? `${model.height_cm} cm` : null, model.city].filter(
    Boolean,
  ) as string[];
  const price = modelPrice(model.details, locale);
  const fresh = isNewModel(model.published_at);

  return (
    <Link
      href={{ pathname: '/models/[slug]', params: { slug: model.slug } }}
      className={cn('group block', className)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-1 ring-1 ring-line transition-shadow duration-500 group-hover:ring-gold/60">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-[1200ms] ease-lux group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(80%_60%_at_50%_35%,#1b1b21,#131317)]">
            <span className="font-display text-6xl text-bone-faint">
              {model.stage_name.charAt(0)}
            </span>
          </div>
        )}

        {/* A scrim that is always there at the foot so the price tag reads on
            any photo, and deepens on hover for the "view" cue. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />

        {index != null && (
          <span className="ordinal absolute left-3 top-3 text-bone/80 mix-blend-difference">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {fresh && (
          <span className="absolute right-3 top-3 bg-gold px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ink">
            {NEW_LABEL[locale]}
          </span>
        )}

        {price && (
          <span className="absolute bottom-3 left-3 bg-gold px-2.5 py-1 text-[0.75rem] font-medium tabular-nums tracking-[0.04em] text-ink shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
            {price}
          </span>
        )}

        <span className="pointer-events-none absolute bottom-3 right-3 translate-y-2 text-[0.625rem] uppercase tracking-[0.2em] text-bone opacity-0 transition-all duration-500 ease-lux group-hover:translate-y-0 group-hover:opacity-100">
          {VIEW_LABEL[locale]} &#8599;
        </span>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-lg leading-none text-bone transition-colors group-hover:text-gold">
            {model.stage_name}
          </h3>
          <span className="ordinal shrink-0 transition-transform duration-500 ease-lux group-hover:translate-x-1">
            &#8599;
          </span>
        </div>
        {(meta.length > 0 || tag) && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] uppercase tracking-[0.16em] text-bone-faint">
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="h-px w-2 bg-line-strong" />}
                {m}
              </span>
            ))}
            {tag && (
              <span className="flex items-center gap-2 text-gold/90">
                {meta.length > 0 && <span aria-hidden className="h-px w-2 bg-line-strong" />}
                {tag}
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}
