import { getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { tField } from '@/lib/i18n-text';
import type { PublicSiteSettings } from '@/lib/supabase/types';

export async function AnnouncementBar({ settings }: { settings: PublicSiteSettings }) {
  const ann = (settings.announcement ?? {}) as { enabled?: boolean; text?: unknown };
  if (!ann.enabled) return null;

  const locale = (await getLocale()) as Locale;
  const text = tField(settings.announcement, 'text', locale);
  if (!text) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] bg-gold px-4 py-1.5 text-center text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink">
      {text}
    </div>
  );
}
