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
    <div className="bg-gold px-4 py-2 text-center text-xs font-medium tracking-wide text-ink">
      {text}
    </div>
  );
}
