'use client';

import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  enrollTotpAction,
  listFactorsAction,
  verifyTotpAction,
  type ActionState,
} from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { CMS_LOCALE } from '@/lib/admin-path';
import { Input, Label, FormError } from '@/components/ui/Field';

const errCopy: Record<string, { vi: string; en: string }> = {
  invalid_code: { vi: 'Mã không đúng. Thử lại.', en: 'Wrong code. Try again.' },
  rate_limited: { vi: 'Quá nhiều lần thử. Đợi một lát.', en: 'Too many attempts. Wait a moment.' },
  enroll_failed: { vi: 'Không thiết lập được. Tải lại trang.', en: 'Enrolment failed. Reload the page.' },
};

export function MfaClient() {
  const t = useTranslations('admin');
  const locale = CMS_LOCALE;

  const [mode, setMode] = useState<'loading' | 'enroll' | 'verify'>('loading');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [bootError, setBootError] = useState<string | null>(null);

  const [state, action, pending] = useActionState<ActionState, FormData>(
    verifyTotpAction,
    {},
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await listFactorsAction();
      if (!alive) return;
      const data = list.data as
        | { verified: Array<{ id: string }>; unverified: Array<{ id: string }> }
        | undefined;
      if (data?.verified?.length) {
        setFactorId(data.verified[0]!.id);
        setMode('verify');
        return;
      }
      const enrolled = await enrollTotpAction();
      if (!alive) return;
      if (enrolled.error || !enrolled.data) {
        setBootError(enrolled.error ?? 'enroll_failed');
        return;
      }
      const d = enrolled.data as { factorId: string; secret: string; qr: string };
      setFactorId(d.factorId);
      setSecret(d.secret);
      setQr(d.qr);
      setMode('enroll');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const err = state.error
    ? (errCopy[state.error]?.[locale] ?? errCopy.invalid_code[locale])
    : bootError
      ? (errCopy[bootError]?.[locale] ?? errCopy.enroll_failed[locale])
      : null;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <p className="kicker">{t('mfaTitle')}</p>
        {mode === 'enroll' && (
          <p className="mt-2 text-sm text-bone-dim">{t('mfaEnrol')}</p>
        )}
      </div>

      {mode === 'loading' && (
        <p className="text-center text-sm text-bone-faint">…</p>
      )}

      {mode === 'enroll' && qr && (
        <div className="flex flex-col items-center gap-3">
          <Image src={qr} alt="TOTP QR" width={200} height={200} unoptimized />
          <code className="select-all break-all bg-surface-2 px-2 py-1 text-xs text-bone-dim">
            {secret}
          </code>
        </div>
      )}

      {mode !== 'loading' && (
        <form action={action} className="space-y-4">
          <input type="hidden" name="factorId" value={factorId} />
          <input type="hidden" name="locale" value={locale} />
          <div>
            <Label htmlFor="code">{t('mfaCode')}</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="tracking-[0.5em]"
            />
          </div>
          {err && <FormError>{err}</FormError>}
          <Button type="submit" disabled={pending || !factorId} className="w-full">
            {t('mfaVerify')}
          </Button>
        </form>
      )}
    </div>
  );
}
