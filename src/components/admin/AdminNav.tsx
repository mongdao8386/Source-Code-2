'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { ComponentProps } from 'react';
import type { StaffRole } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

type Href = ComponentProps<typeof Link>['href'];

type Labels = Record<
  | 'dashboard'
  | 'models'
  | 'categories'
  | 'pages'
  | 'testimonials'
  | 'settings'
  | 'users'
  | 'audit',
  string
>;

const items: Array<{ href: string; key: keyof Labels; ownerOnly?: boolean }> = [
  { href: '/admin', key: 'dashboard' },
  { href: '/admin/models', key: 'models' },
  { href: '/admin/categories', key: 'categories' },
  { href: '/admin/pages', key: 'pages' },
  { href: '/admin/testimonials', key: 'testimonials' },
  { href: '/admin/settings', key: 'settings' },
  { href: '/admin/users', key: 'users', ownerOnly: true },
  { href: '/admin/audit', key: 'audit' },
];

export function AdminNav({
  role,
  labels,
  horizontal = false,
}: {
  role: StaffRole;
  labels: Labels;
  horizontal?: boolean;
}) {
  const pathname = usePathname();
  const visible = items.filter((i) => !i.ownerOnly || role === 'owner');

  return (
    <nav
      className={cn(
        horizontal
          ? 'flex gap-1 overflow-x-auto'
          : 'flex flex-col gap-1 px-3 py-4',
      )}
    >
      {visible.map((i) => {
        // strip the /vi or /en prefix for comparison
        const path = pathname.replace(/^\/(vi|en)/, '') || '/';
        const active =
          i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href as Href}
            className={cn(
              'whitespace-nowrap px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors',
              active ? 'bg-surface-2 text-gold' : 'text-bone-dim hover:text-bone',
            )}
          >
            {labels[i.key]}
          </Link>
        );
      })}
    </nav>
  );
}
