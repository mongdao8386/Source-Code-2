import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { Stars } from '@/components/site/Stars';
import { FeedbackMediaGrid } from '@/components/site/FeedbackMediaGrid';
import { readFeedbackMedia, readRating, type FeedbackItem } from '@/lib/feedback';
import { t } from '@/lib/i18n-text';

const ANONYMOUS: Record<Locale, string> = { vi: 'Khách ẩn danh', en: 'Anonymous' };

/**
 * One customer review: who, when, how many stars, which model, what they
 * said, and whatever they sent along with it.
 */
export function FeedbackCard({
  item,
  locale,
  showModel = true,
  aboutLabel,
}: {
  item: FeedbackItem;
  locale: Locale;
  /** Off on a model's own page, where every card is about her. */
  showModel?: boolean;
  /** "Về" / "About" — prefix for the model chip. */
  aboutLabel?: string;
}) {
  const media = readFeedbackMedia(item.media);
  const quote = t(item.quote, locale);
  const anonymous = item.is_anonymous || !item.author.trim();
  const name = anonymous ? ANONYMOUS[locale] : item.author;
  // reviewed_at is a bare date; parse it as local so it does not slip a day.
  const date = item.reviewed_at
    ? new Date(`${item.reviewed_at}T12:00:00`).toLocaleDateString(
        locale === 'vi' ? 'vi-VN' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    : '';
  const meta = [item.role, date].filter(Boolean).join(' · ');
  const initial = anonymous ? '?' : (Array.from(item.author.normalize('NFKC').trim())[0] ?? '').toUpperCase();

  return (
    <article className="border border-line bg-surface-1/30 p-5 transition-colors duration-500 hover:border-gold/40 md:p-6">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-lg text-gold">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-bone">{name}</p>
          {meta && (
            <p className="mt-0.5 truncate text-[0.6875rem] uppercase tracking-[0.16em] text-bone-faint">
              {meta}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Stars rating={readRating(item.rating)} />
        </div>
      </header>

      {showModel && item.model && (
        <Link
          href={{ pathname: '/models/[slug]', params: { slug: item.model.slug } }}
          className="mt-4 inline-flex items-center gap-2 border border-line-strong px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.2em] text-bone-dim transition-colors hover:border-gold hover:text-gold"
        >
          {aboutLabel && <span className="text-bone-faint">{aboutLabel}</span>}
          <span className="text-gold">{item.model.stage_name}</span>
        </Link>
      )}

      {quote && (
        <blockquote className="mt-4 whitespace-pre-line font-display text-lg leading-snug text-bone md:text-xl">
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      <FeedbackMediaGrid media={media} alt={name} />
    </article>
  );
}
