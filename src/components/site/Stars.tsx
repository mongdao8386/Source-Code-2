/**
 * Star rating for testimonials.
 *
 * The rating column and the CMS field both existed from the start, but nothing
 * ever rendered them — staff could set 1–5 stars and the value was stored and
 * silently ignored on the public site.
 */
export function Stars({ rating }: { rating: number | null }) {
  if (!rating || rating < 1) return null;
  const filled = Math.min(5, Math.round(rating));

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${filled} / 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          aria-hidden
          className={i < filled ? 'text-gold' : 'text-bone-faint/40'}
        >
          <path
            d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}
