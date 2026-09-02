'use client';

import { useRef, useState } from 'react';
import { publicPhotoUrl } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Field';

/** Mirrors the server rule: only objects this app uploaded are valid. */
const UPLOADED = /^brand\/[a-z]+-[0-9a-f-]{36}\.(webp|png)$/;

/**
 * Hero image intake.
 *
 * Logo, favicon and the OG image got an uploader from the start; this one did
 * not, so the field was a bare path box — you had to put the file somewhere
 * else first and paste a URL back. Same endpoint as the rest of the brand
 * assets, `kind=hero`, which crops to the frame the home page actually renders.
 *
 * There is deliberately no manual path box. The old one offered "storage path
 * or https URL", but next/image only serves what remotePatterns admits — the
 * Supabase public bucket — so an external URL saved cleanly and then rendered
 * as nothing. Uploading is the only way that actually reaches the page.
 */

const ERRORS: Record<string, string> = {
  too_large: 'Ảnh nặng quá 5 MB.',
  unsupported_type: 'Chỉ nhận JPEG, PNG, WebP hoặc SVG.',
  decode_failed: 'Không đọc được ảnh — file có thể đã hỏng.',
  bad_request: 'Thiếu file.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.',
};

export function HeroImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // A value saved back when this field was a free-text box. It renders in the
  // preview below but not on the public page, so say so rather than let it
  // look fine here and come out black there.
  const legacy = value !== '' && !UPLOADED.test(value);

  async function upload(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'hero');
      const res = await fetch('/api/admin/brand', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErr(ERRORS[json.error] ?? json.error ?? 'Tải lên thất bại.');
        return;
      }
      onChange(json.path);
    } catch {
      setErr('Không gọi được máy chủ. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <Label htmlFor="hi">Ảnh nền hero</Label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex min-h-40 items-center justify-center overflow-hidden border border-dashed bg-ink transition-colors ${
          over ? 'border-gold' : 'border-line-strong'
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicPhotoUrl(value)}
              alt=""
              className="h-40 w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          </>
        ) : null}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          {!value && (
            <p className="px-4 text-xs text-bone-faint">
              Kéo ảnh vào đây, hoặc bấm nút bên dưới.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Đang tải…' : value ? 'Đổi ảnh' : 'Tải lên'}
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
                Xoá
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />

      <p className="mt-2 text-xs text-bone-faint">
        Ảnh được cắt về 2000×1250 và chuyển sang WebP. Tối đa 5 MB.
      </p>

      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}

      {legacy && (
        <p className="mt-2 text-xs text-amber-300">
          Giá trị hiện tại là một đường dẫn ngoài, không phải ảnh đã tải lên. Trang
          chủ không hiển thị được ảnh này — tải lại ảnh bằng nút ở trên, hoặc bấm
          Xoá, rồi mới lưu được.
        </p>
      )}
    </div>
  );
}
