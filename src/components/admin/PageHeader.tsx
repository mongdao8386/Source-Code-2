import type { ReactNode } from 'react';
import Link from 'next/link';

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Where this page was reached from — a sub-page's way back to its list. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between border-b border-line pb-4">
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-bone-dim transition-colors hover:text-gold"
          >
            <span aria-hidden>&larr;</span> {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl text-bone">{title}</h1>
        {description && <p className="mt-1 text-sm text-bone-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}
