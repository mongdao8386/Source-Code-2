import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ModelListItem } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

export function ModelCard({
  model,
  locale,
  priority = false,
  className,
}: {
  model: ModelListItem;
  locale: Locale;
  priority?: boolean;
  className?: string;
}) {
  const src = model.cover ? publicPhotoUrl(model.cover.storage_path) : '';
  const alt = model.cover ? t(model.cover.alt, locale) || model.stage_name : model.stage_name;

  return (
    <Link
      href={{ pathname: '/models/[slug]', params: { slug: model.slug } }}
      className={cn('group block', className)}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-1">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-lux group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-bone-faint">
            <span className="font-display text-4xl">{model.stage_name.charAt(0)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="font-display text-xl text-bone">{model.stage_name}</h3>
        {model.height_cm ? (
          <span className="text-xs tracking-widest text-bone-dim">{model.height_cm} cm</span>
        ) : null}
      </div>
      {model.city ? (
        <p className="kicker mt-1">{model.city}</p>
      ) : null}
    </Link>
  );
}
