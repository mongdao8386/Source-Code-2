import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { StaffRole } from '@/lib/supabase/types';
import { signOutAction } from '@/lib/auth/actions';
import { AdminNav } from './AdminNav';

export async function AdminShell({
  role,
  email,
  children,
}: {
  role: StaffRole;
  email: string;
  children: ReactNode;
}) {
  const t = await getTranslations('admin');

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[15rem_1fr]">
      <aside className="pad-safe-top hidden flex-col border-r border-line bg-surface-1 md:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="font-display text-lg">
            STUDIO<span className="text-gold">.</span>
          </p>
          <p className="kicker mt-1">Console</p>
        </div>

        <AdminNav role={role} labels={{
          dashboard: t('nav.dashboard'),
          models: t('nav.models'),
          categories: t('nav.categories'),
          pages: t('nav.pages'),
          testimonials: t('nav.testimonials'),
          settings: t('nav.settings'),
          users: t('nav.users'),
          audit: t('nav.audit'),
        }} />

        <div className="mt-auto border-t border-line px-5 py-4">
          <p className="truncate text-xs text-bone-dim">{email}</p>
          <form action={signOutAction} className="mt-2">
            <button className="text-xs uppercase tracking-[0.18em] text-bone-faint hover:text-bone">
              {t('signOut')}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="pad-safe-top gutter-safe flex items-center justify-between border-b border-line py-3 md:hidden">
          <p className="font-display text-base">
            STUDIO<span className="text-gold">.</span>
          </p>
          <form action={signOutAction}>
            <button className="text-xs uppercase tracking-[0.18em] text-bone-faint">
              {t('signOut')}
            </button>
          </form>
        </header>

        {/* mobile nav */}
        <div className="inset-safe-x border-b border-line px-3 py-2 md:hidden">
          <AdminNav
            role={role}
            horizontal
            labels={{
              dashboard: t('nav.dashboard'),
              models: t('nav.models'),
              categories: t('nav.categories'),
              pages: t('nav.pages'),
              testimonials: t('nav.testimonials'),
              settings: t('nav.settings'),
              users: t('nav.users'),
              audit: t('nav.audit'),
            }}
          />
        </div>

        <main className="gutter-safe pad-safe-bottom flex-1 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
