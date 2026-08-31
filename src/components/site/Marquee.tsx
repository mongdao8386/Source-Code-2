import { Fragment } from 'react';

/**
 * Continuous ticker strip. The items are rendered twice because the CSS
 * animation translates by -50%: the second copy is what occupies the gap as
 * the first scrolls out, so the loop has no seam.
 */
export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const run = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-line py-4">
      <div className="marquee">
        {run.map((item, i) => (
          <Fragment key={i}>
            <span className="kicker whitespace-nowrap px-6 text-bone">{item}</span>
            <span aria-hidden className="select-none px-0 text-gold">
              &#8226;
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
