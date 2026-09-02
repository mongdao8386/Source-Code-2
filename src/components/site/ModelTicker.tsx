import Image from 'next/image';
import { Fragment } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ModelListItem } from '@/lib/queries/public';
import { publicPhotoUrl } from '@/lib/storage';
import { t } from '@/lib/i18n-text';

/**
 * Full-bleed strip of faces that scrolls on its own and stops under the
 * cursor, so a card can be read and clicked without chasing it.
 *
 * Same `.marquee` the category ticker uses: the run is rendered twice because
 * the keyframe translates by -50%, and the second copy fills the gap the first
 * leaves as it goes. Pausing on hover and on keyboard focus is CSS, and
 * prefers-reduced-motion already stops it globally.
 */

/** Enough tiles that the strip spans a wide screen before it repeats. */
const MIN_TILES = 8;

export function ModelTicker({
  models,
  locale,
}: {
  models: ModelListItem[];
  locale: Locale;
}) {
  // One face sliding past is not a ticker, it is a photo with a delay.
  if (models.length < 2) return null;

  const base: ModelListItem[] = [];
  while (base.length < MIN_TILES) base.push(...models);

  return (
    <div
      className="mt-28 overflow-hidden border-y border-line py-6 md:mt-40"
      style={{ ['--marquee-duration' as string]: '55s' }}
    >
      <div className="marquee gap-4">
        {[0, 1].map((copy) => (
          <Fragment key={copy}>
            {base.map((m, i) => {
              const src = m.cover ? publicPhotoUrl(m.cover.storage_path) : '';
              const alt = m.cover ? t(m.cover.alt, locale) || m.stage_name : m.stage_name;
              return (
                <Link
                  key={`${copy}-${i}`}
                  href={{ pathname: '/models/[slug]', params: { slug: m.slug } }}
                  // The duplicate exists only to hide the seam. Letting a
                  // screen reader or Tab key reach it would mean every model
                  // appearing twice in the same strip.
                  aria-hidden={copy === 1}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="group relative block h-56 w-40 shrink-0 overflow-hidden bg-surface-1 md:h-72 md:w-52"
                >
                  {src ? (
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      sizes="(max-width: 768px) 40vw, 210px"
                      className="object-cover transition-transform duration-[1200ms] ease-lux group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(80%_60%_at_50%_35%,#1b1b21,#131317)]">
                      <span className="font-display text-4xl text-bone-faint">
                        {m.stage_name.charAt(0)}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 truncate font-display text-lg text-bone transition-colors group-hover:text-gold">
                    {m.stage_name}
                  </span>
                </Link>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
