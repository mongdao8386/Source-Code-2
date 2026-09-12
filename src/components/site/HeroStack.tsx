import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ModelListItem } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import { t } from '@/lib/i18n-text';
import { cn } from '@/lib/cn';

/**
 * Three portraits above the fold.
 *
 * The old hero was a headline over a dark gradient; the faces, which are the
 * whole reason to stay, began one full screen down. These are the three
 * newest profiles with a cover, laid over each other like prints on a table
 * on a wide screen and side by side on a phone. Each is a link.
 */
const SLOT = [
  // Main print, right, slightly turned.
  'lg:absolute lg:right-0 lg:top-[5%] lg:z-20 lg:w-[58%] lg:rotate-2',
  // Lower left, overlapping the main one.
  'lg:absolute lg:bottom-0 lg:left-[2%] lg:z-30 lg:w-[44%] lg:-rotate-5',
  // Upper left, behind both.
  'lg:absolute lg:left-[16%] lg:top-0 lg:z-10 lg:w-[34%] lg:-rotate-1 lg:opacity-90',
];

export function HeroStack({
  models,
  locale,
  note,
}: {
  models: ModelListItem[];
  locale: Locale;
  note?: string;
}) {
  const picks = models.filter((m) => m.cover).slice(0, 3);
  if (picks.length === 0) return null;

  return (
    <div className="glow-gold relative grid grid-cols-3 gap-4 lg:block lg:aspect-[4/5] lg:w-full">
      {picks.map((m, i) => {
        const src = publicPhotoUrl(m.cover!.storage_path);
        const alt = t(m.cover!.alt, locale) || m.stage_name;
        return (
          <Link
            key={m.id}
            href={{ pathname: '/models/[slug]', params: { slug: m.slug } }}
            className={cn(
              'frame-gold group relative block aspect-[3/4] overflow-hidden bg-surface-1',
              'shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-lux',
              'hover:z-40 hover:scale-[1.03]',
              SLOT[i],
            )}
          >
            <Image
              src={src}
              alt={alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 33vw, 28vw"
              className="object-cover transition-transform duration-[1400ms] ease-lux group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
            <span className="absolute inset-x-3 bottom-3 flex items-baseline justify-between gap-2">
              <span className="truncate font-display text-base text-bone md:text-lg">
                {m.stage_name}
              </span>
              {m.city && (
                <span className="kicker hidden shrink-0 text-[0.55rem] text-bone-dim md:block">
                  {m.city}
                </span>
              )}
            </span>
          </Link>
        );
      })}

      {note && (
        <div className="absolute -bottom-5 right-[6%] z-40 hidden items-center gap-2 border border-line-strong bg-ink/90 px-3.5 py-2 text-[0.625rem] uppercase tracking-[0.2em] text-bone shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md lg:flex">
          <span className="pulse-dot" aria-hidden />
          {note}
        </div>
      )}
    </div>
  );
}
