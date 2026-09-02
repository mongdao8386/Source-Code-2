'use client';

import { useCallback, useState } from 'react';

/**
 * Client half of /api/admin/translate.
 *
 * `available` latches false the first time the server says the key is missing,
 * so an unconfigured install shows the button once, explains itself, and then
 * stops offering something that cannot work.
 */

const MESSAGES: Record<string, string> = {
  not_configured: 'Chưa cấu hình DEEPL_API_KEY trên máy chủ.',
  unauthorized: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.',
  bad_request: 'Nội dung không hợp lệ (quá dài hoặc rỗng).',
  upstream_unreachable: 'Không gọi được DeepL. Kiểm tra mạng của máy chủ.',
  upstream_malformed: 'DeepL trả về dữ liệu không đọc được.',
};

export function useTranslate() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const translate = useCallback(async (text: string[]): Promise<string[] | null> => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const code = json?.error ?? 'upstream_error';
        if (code === 'not_configured') setAvailable(false);
        setErr(
          MESSAGES[code] ??
            // DeepL's own words: quota, an unsupported language pair and a bad
            // key are different problems and only the detail separates them.
            `DeepL báo lỗi ${json?.status ?? res.status}. ${json?.detail ?? ''}`.trim(),
        );
        return null;
      }
      return (json?.translations as string[]) ?? null;
    } catch {
      setErr('Không gọi được máy chủ.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { translate, busy, err, available };
}
