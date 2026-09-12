'use client';

import { useRef, useState, useTransition } from 'react';
import type { SiteSettings } from '@/lib/supabase/types';
import { updateSettingsAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, FormError } from '@/components/ui/Field';
import { BrandFields, type BrandState } from './BrandFields';
import { HeroImageField } from './HeroImageField';
import { TwoLang } from '@/components/admin/TwoLang';
import { USERNAME_RE, normalizeUsername } from '@/lib/telegram';
import { publicPhotoUrl } from '@/lib/storage';

/**
 * The action already reports which field failed; the form used to throw that
 * away and print "Kiểm tra lại các trường", leaving you to guess across a
 * dozen inputs. Name them instead.
 */
const FIELD_LABELS: Record<string, string> = {
  telegram_channel_url: 'Link kênh đặt lịch',
  telegram_support: 'Hỗ trợ Telegram (username)',
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
    support: readSupport(settings.telegram_support),
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
        telegram_support: form.support,
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
        <h2 className="kicker">Kênh đặt lịch</h2>
        <div>
          <Label htmlFor="tg">Link kênh Telegram</Label>
          <Input
            id="tg"
            value={form.telegram_channel_url}
            onChange={(e) => set({ telegram_channel_url: e.target.value })}
            placeholder="https://t.me/+…"
          />
          <p className="mt-1 text-xs text-bone-faint">
            Nút “Đặt lịch” trên toàn site mở link này. Link mời riêng tư dùng được và không
            bao giờ hiện ra ngoài. Để trống = nút bị vô hiệu hoá.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="kicker">Hỗ trợ Telegram</h2>
        <p className="text-xs text-bone-faint">
          Hai tài khoản hỗ trợ, hiện dạng tên + @username ở trang chủ, trang người mẫu,
          chân trang, menu điện thoại và nút Telegram nổi. Khách bấm là mở chat trực tiếp.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((i) => (
            <SupportField
              key={i}
              n={i + 1}
              value={form.support[i]}
              onChange={(v) =>
                set({ support: form.support.map((row, j) => (j === i ? v : row)) as SupportRows })
              }
            />
          ))}
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

      {/* Kept for the data already stored, but tucked away: nothing on the
          public site reads these — support is the two Telegram channels. */}
      <details className="group border border-line p-4">
        <summary className="kicker cursor-pointer list-none">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
          Liên hệ khác (không hiện trên site)
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
      </details>

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

type SupportRow = { name: string; username: string; avatar_path: string };
type SupportRows = [SupportRow, SupportRow];

const UPLOAD_ERRORS: Record<string, string> = {
  too_large: 'Ảnh nặng quá 5 MB.',
  unsupported_type: 'Chỉ nhận JPEG, PNG hoặc WebP.',
  decode_failed: 'Không đọc được ảnh — file có thể đã hỏng.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.',
};

/** jsonb in, two rows out — never fewer, so both boxes always render. */
function readSupport(v: unknown): SupportRows {
  const arr = Array.isArray(v) ? v : [];
  const row = (k: number): SupportRow => {
    const o = (arr[k] ?? {}) as { name?: unknown; username?: unknown; avatar_path?: unknown };
    return {
      name: typeof o.name === 'string' ? o.name : '',
      username: typeof o.username === 'string' ? o.username : '',
      avatar_path: typeof o.avatar_path === 'string' ? o.avatar_path : '',
    };
  };
  return [row(0), row(1)];
}

/**
 * One support person: a display name and a username. The username box takes
 * "@nam", "t.me/nam" or "nam" and shows what the site will render, so a
 * pasted invite link — which has no username in it — is caught here rather
 * than by a confused visitor.
 */
function SupportField({
  n,
  value,
  onChange,
}: {
  n: number;
  value: SupportRow;
  onChange: (v: SupportRow) => void;
}) {
  const username = normalizeUsername(value.username);
  const bad = username !== '' && !USERNAME_RE.test(username);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const initial = Array.from((value.name || `Hỗ trợ ${n}`).normalize('NFKC').trim())[0] ?? '';

  async function upload(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'avatar');
      const res = await fetch('/api/admin/brand', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErr(UPLOAD_ERRORS[json.error] ?? json.error ?? 'upload_failed');
        return;
      }
      onChange({ ...value, avatar_path: json.path });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3 border border-line p-4">
      <p className="kicker">Hỗ trợ {n}</p>

      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-ink font-display text-2xl text-gold">
          {value.avatar_path ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={publicPhotoUrl(value.avatar_path)} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0">
          <p className="kicker mb-2 text-[0.625rem]">Avatar</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? '…' : value.avatar_path ? 'Đổi ảnh' : 'Tải ảnh'}
            </Button>
            {value.avatar_path && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...value, avatar_path: '' })}
              >
                Xoá
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-bone-faint">
            {err ? <span className="text-red-300">{err}</span> : 'Cắt vuông, hiện tròn. Không có thì hiện chữ cái đầu.'}
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor={`sn${n}`}>Tên hiển thị</Label>
        <Input
          id={`sn${n}`}
          value={value.name}
          maxLength={40}
          placeholder={`Ví dụ: Admin ${n === 1 ? 'Nam' : 'Linh'}`}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor={`su${n}`}>Username Telegram</Label>
        <Input
          id={`su${n}`}
          value={value.username}
          placeholder="@username"
          onChange={(e) => onChange({ ...value, username: e.target.value })}
          className={bad ? 'border-red-500/70' : undefined}
        />
        <p className={'mt-1 text-xs ' + (bad ? 'text-red-300' : 'text-bone-faint')}>
          {bad
            ? 'Không phải username. Link mời (t.me/+…) không dùng được ở đây — cần username của tài khoản.'
            : username
              ? `Hiện trên site là ${value.name.trim() || `Hỗ trợ ${n}`} · @${username}`
              : 'Để trống nếu chưa dùng.'}
        </p>
      </div>
    </div>
  );
}
