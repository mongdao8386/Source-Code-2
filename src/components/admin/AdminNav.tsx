'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { StaffRole } from '@/lib/supabase/types';
import { ADMIN_PATH, adminHref } from '@/lib/admin-path';
import { cn } from '@/lib/cn';

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
  { href: '', key: 'dashboard' },
  { href: '/models', key: 'models' },
  { href: '/categories', key: 'categories' },
  { href: '/pages', key: 'pages' },
  { href: '/testimonials', key: 'testimonials' },
  { href: '/settings', key: 'settings' },
  { href: '/users', key: 'users', ownerOnly: true },
  { href: '/audit', key: 'audit' },
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
        // compare against the path below the configurable CMS root
        const sub = pathname.startsWith(ADMIN_PATH)
          ? pathname.slice(ADMIN_PATH.length) || '/'
          : pathname;
        const active = i.href === '' ? sub === '/' : sub.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={adminHref(i.href)}
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
