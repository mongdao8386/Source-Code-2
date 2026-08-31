import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between border-b border-line pb-4">
      <div>
        <h1 className="font-display text-2xl text-bone">{title}</h1>
        {description && <p className="mt-1 text-sm text-bone-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}
