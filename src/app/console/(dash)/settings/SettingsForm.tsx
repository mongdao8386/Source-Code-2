'use client';

import { useState, useTransition } from 'react';
import type { SiteSettings } from '@/lib/supabase/types';
import { updateSettingsAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, FormError } from '@/components/ui/Field';
import { BrandFields, type BrandState } from './BrandFields';
import { HeroImageField } from './HeroImageField';
import { TwoLang } from '@/components/admin/TwoLang';

/**
 * The action already reports which field failed; the form used to throw that
 * away and print "Kiểm tra lại các trường", leaving you to guess across a
 * dozen inputs. Name them instead.
 */
const FIELD_LABELS: Record<string, string> = {
  telegram_channel_url: 'Telegram channel URL',
  brand_name: 'Tên site',
  logo_path: 'Logo',
  favicon_path: 'Favicon',
  og_image_path: 'Ảnh chia sẻ link',
  accent_color: 'Màu nhấn',
  contact_email: 'Contact email',
  phone: 'Phone',
  socials: 'Instagram / Facebook / TikTok',
  hero: 'Hero (headline, sub hoặc ảnh nền)',
  announcement: 'Announcement',
  maintenance_mode: 'Maintenance mode',
};

function describe(res: { error: string; fieldErrors?: Record<string, string[]> }): string {
  if (res.error !== 'validation') return res.error;
  const bad = Object.keys(res.fieldErrors ?? {});
  if (bad.length === 0) return 'Kiểm tra lại các trường.';
  return `Chưa lưu được — kiểm tra: ${bad.map((k) => FIELD_LABELS[k] ?? k).join(', ')}.`;
}

type Bag = { vi?: string; en?: string };
const bag = (v: unknown): Bag => (v && typeof v === 'object' ? (v as Bag) : {});
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const hero = obj(settings.hero);
  const socials = obj(settings.socials);
  const ann = obj(settings.announcement);

  const [form, setForm] = useState({
    telegram_channel_url: settings.telegram_channel_url ?? '',
    brand_name: settings.brand_name ?? 'STUDIO',
    logo_path: settings.logo_path ?? '',
    favicon_path: settings.favicon_path ?? '',
    og_image_path: settings.og_image_path ?? '',
    accent_color: settings.accent_color ?? '#c8a253',
    contact_email: settings.contact_email ?? '',
    phone: settings.phone ?? '',
    ig: (socials.instagram as string) ?? '',
    fb: (socials.facebook as string) ?? '',
    tt: (socials.tiktok as string) ?? '',
    headline: bag(hero.headline),
    sub: bag(hero.sub),
    heroImage: (hero.image as string) ?? '',
    annEnabled: Boolean(ann.enabled),
    annText: bag(ann.text),
    maintenance: Boolean(settings.maintenance_mode),
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await updateSettingsAction({
        telegram_channel_url: form.telegram_channel_url,
        brand_name: form.brand_name,
        logo_path: form.logo_path,
        favicon_path: form.favicon_path,
        og_image_path: form.og_image_path,
        accent_color: form.accent_color,
        contact_email: form.contact_email,
        phone: form.phone,
        socials: { instagram: form.ig, facebook: form.fb, tiktok: form.tt },
        hero: { headline: form.headline, sub: form.sub, image: form.heroImage },
        announcement: { enabled: form.annEnabled, text: form.annText },
        maintenance_mode: form.maintenance,
      });
      setMsg(
        res.ok
          ? { kind: 'ok', text: 'Đã lưu / Saved' }
          : { kind: 'err', text: describe(res) },
      );
    });
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-10">
      <BrandFields
        value={{
          brand_name: form.brand_name,
          logo_path: form.logo_path,
          favicon_path: form.favicon_path,
          og_image_path: form.og_image_path,
          accent_color: form.accent_color,
        }}
        onChange={(patch: Partial<BrandState>) => set(patch)}
      />

      <section className="space-y-4">
        <h2 className="kicker">Booking</h2>
        <div>
          <Label htmlFor="tg">Telegram channel URL</Label>
          <Input
            id="tg"
            value={form.telegram_channel_url}
            onChange={(e) => set({ telegram_channel_url: e.target.value })}
            placeholder="https://t.me/your_channel"
          />
          <p className="mt-1 text-xs text-bone-faint">
            Nút “Đặt lịch” trên toàn site sẽ mở link này. Để trống = nút bị vô hiệu hoá.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="kicker">Hero</h2>
        <TwoLang
          label="Headline"
          value={form.headline}
          onChange={(headline) => set({ headline })}
        />
        <TwoLang label="Sub" value={form.sub} onChange={(sub) => set({ sub })} textarea />
        <HeroImageField
          value={form.heroImage}
          onChange={(heroImage) => set({ heroImage })}
        />
      </section>

      <section className="space-y-4">
        <h2 className="kicker">Contact & socials</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ce">Contact email</Label>
            <Input id="ce" value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ig">Instagram</Label>
            <Input id="ig" value={form.ig} onChange={(e) => set({ ig: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="fb">Facebook</Label>
            <Input id="fb" value={form.fb} onChange={(e) => set({ fb: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="tt">TikTok</Label>
            <Input id="tt" value={form.tt} onChange={(e) => set({ tt: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="kicker">Announcement</h2>
        <label className="flex items-center gap-3 text-sm text-bone-dim">
          <input
            type="checkbox"
            checked={form.annEnabled}
            onChange={(e) => set({ annEnabled: e.target.checked })}
          />
          Bật thanh thông báo
        </label>
        <TwoLang label="Text" value={form.annText} onChange={(annText) => set({ annText })} />
      </section>

      <section>
        <label className="flex items-center gap-3 text-sm text-bone-dim">
          <input
            type="checkbox"
            checked={form.maintenance}
            onChange={(e) => set({ maintenance: e.target.checked })}
          />
          Maintenance mode
        </label>
      </section>

      {msg && (msg.kind === 'err' ? <FormError>{msg.text}</FormError> : <p className="text-sm text-gold">{msg.text}</p>)}

      <Button type="submit" disabled={pending}>
        {pending ? '…' : 'Lưu / Save'}
      </Button>
    </form>
  );
}

