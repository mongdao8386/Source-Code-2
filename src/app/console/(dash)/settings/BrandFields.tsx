'use client';

import { useRef, useState } from 'react';
import { publicPhotoUrl } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Field';

export type BrandState = {
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  og_image_path: string;
  accent_color: string;
};

const KIND_LABEL = {
  logo: 'Logo (thay chữ trên header)',
  favicon: 'Favicon (icon trên tab)',
  og: 'Ảnh khi chia sẻ link (1200×630)',
} as const;
type Kind = keyof typeof KIND_LABEL;

const PATH_KEY: Record<Kind, keyof BrandState> = {
  logo: 'logo_path',
  favicon: 'favicon_path',
  og: 'og_image_path',
};

/**
 * Brand editor with a live preview. Everything renders from local state before
 * anything is saved, so the header, tab icon and accent can be judged against
 * the real dark background instead of imagined from field values.
 */
export function BrandFields({
  value,
  onChange,
}: {
  value: BrandState;
  onChange: (patch: Partial<BrandState>) => void;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const ogRef = useRef<HTMLInputElement>(null);
  const refs: Record<Kind, React.RefObject<HTMLInputElement | null>> = {
    logo: logoRef,
    favicon: faviconRef,
    og: ogRef,
  };

  async function upload(kind: Kind, file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/admin/brand', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? 'upload_failed');
        return;
      }
      onChange({ [PATH_KEY[kind]]: json.path } as Partial<BrandState>);
    } finally {
      setBusy(null);
      const el = refs[kind].current;
      if (el) el.value = '';
    }
  }

  const accentValid = /^#[0-9a-fA-F]{6}$/.test(value.accent_color);
  const previewAccent = accentValid ? value.accent_color : '#c8a253';

  return (
    <section className="space-y-6">
      <h2 className="kicker">Thương hiệu</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bn">Tên site</Label>
          <Input
            id="bn"
            value={value.brand_name}
            maxLength={40}
            onChange={(e) => onChange({ brand_name: e.target.value })}
          />
          <p className="mt-1 text-xs text-bone-faint">
            Dùng khi chưa có logo. Dấu chấm cuối vẽ riêng theo màu nhấn.
          </p>
        </div>

        <div>
          <Label htmlFor="ac">Màu nhấn</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={previewAccent}
              onChange={(e) => onChange({ accent_color: e.target.value })}
              className="h-11 w-14 cursor-pointer border border-line-strong bg-surface-1"
              aria-label="Chọn màu nhấn"
            />
            <Input
              id="ac"
              value={value.accent_color}
              onChange={(e) => onChange({ accent_color: e.target.value })}
              className={accentValid ? undefined : 'border-red-500/70'}
            />
          </div>
          {!accentValid && (
            <p className="mt-1 text-xs text-red-300">
              Phải là mã hex 6 ký tự, ví dụ #c8a253.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(KIND_LABEL) as Kind[]).map((kind) => {
          const path = value[PATH_KEY[kind]];
          return (
            <div key={kind} className="border border-line p-3">
              <p className="kicker mb-2 text-[0.625rem]">{KIND_LABEL[kind]}</p>
              <div className="mb-3 flex h-20 items-center justify-center bg-ink">
                {path ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={publicPhotoUrl(path)}
                    alt=""
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-bone-faint">chưa có</span>
                )}
              </div>
              <input
                ref={refs[kind]}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                hidden
                onChange={(e) => upload(kind, e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === kind}
                  onClick={() => refs[kind].current?.click()}
                >
                  {busy === kind ? '…' : path ? 'Đổi' : 'Tải lên'}
                </Button>
                {path && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange({ [PATH_KEY[kind]]: '' } as Partial<BrandState>)}
                  >
                    Xoá
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {err && <p className="text-sm text-red-300">{err}</p>}

      <div>
        <p className="kicker mb-2">Xem trước</p>
        <div
          className="border border-line-strong bg-ink"
          style={{ '--color-gold': previewAccent } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-2">
            <span className="flex h-4 w-4 items-center justify-center overflow-hidden bg-surface-2">
              {value.favicon_path ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={publicPhotoUrl(value.favicon_path)}
                  alt=""
                  className="h-4 w-4 object-cover"
                />
              ) : (
                <span className="text-[0.5rem] text-bone-faint">?</span>
              )}
            </span>
            <span className="truncate text-xs text-bone-dim">
              {value.brand_name || 'STUDIO'} — Model booking
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-lg text-bone">
              {value.logo_path ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={publicPhotoUrl(value.logo_path)} alt="" className="max-h-6" />
              ) : (
                <>
                  {value.brand_name || 'STUDIO'}
                  <span className="text-gold">.</span>
                </>
              )}
            </span>
            <span className="bg-gold px-3 py-1.5 text-[0.5625rem] uppercase tracking-[0.18em] text-ink">
              Đặt lịch
            </span>
          </div>

          <div className="px-4 py-5">
            <p className="text-[0.625rem] uppercase tracking-[0.24em] text-gold">
              Studio · Casting
            </p>
            <p className="mt-2 font-display text-2xl leading-[0.9] text-bone">
              Gương mặt cho khung hình
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
