import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ModelListItem } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

/**
 * Portrait tile for the boards. 3:4 to match how agencies crop — taller
 * frames read as fashion, squarer ones as stock. Metadata stays hidden until
 * hover so the grid is a wall of faces first and a data table second.
 */
export function ModelCard({
  model,
  locale,
  index,
  priority = false,
  className,
}: {
  model: ModelListItem;
  locale: Locale;
  index?: number;
  priority?: boolean;
  className?: string;
}) {
  const src = model.cover ? publicPhotoUrl(model.cover.storage_path) : '';
  const alt = model.cover ? t(model.cover.alt, locale) || model.stage_name : model.stage_name;

  const stats = [
    model.height_cm ? `${model.height_cm}` : null,
    model.city,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={{ pathname: '/models/[slug]', params: { slug: model.slug } }}
      className={cn('group block', className)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-1">
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

        {/* Scrim + stats, revealed on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {index != null && (
          <span className="ordinal absolute left-3 top-3 text-bone/70 mix-blend-difference">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {stats.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-2 items-center gap-3 opacity-0 transition-all duration-500 ease-lux group-hover:translate-y-0 group-hover:opacity-100">
            {stats.map((s) => (
              <span key={s} className="kicker text-bone">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <h3 className="font-display text-lg leading-none text-bone transition-colors group-hover:text-gold">
          {model.stage_name}
        </h3>
        <span className="ordinal shrink-0 transition-transform duration-500 ease-lux group-hover:translate-x-1">
          &#8599;
        </span>
      </div>
    </Link>
  );
}
