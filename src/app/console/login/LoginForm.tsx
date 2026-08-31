'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { signInAction, type ActionState } from '@/lib/auth/actions';
import { CMS_LOCALE } from '@/lib/admin-path';
import { Button } from '@/components/ui/Button';
import { Input, Label, FormError } from '@/components/ui/Field';

const messages: Record<string, { vi: string; en: string }> = {
  bad_credentials: { vi: 'Email hoặc mật khẩu không đúng.', en: 'Wrong email or password.' },
  rate_limited: { vi: 'Quá nhiều lần thử. Thử lại sau ít phút.', en: 'Too many attempts. Try again shortly.' },
  invalid: { vi: 'Dữ liệu không hợp lệ.', en: 'Invalid input.' },
};

export function LoginForm() {
  const t = useTranslations('admin');
  const locale = CMS_LOCALE;
  const [state, action, pending] = useActionState<ActionState, FormData>(signInAction, {});

  const err = state.error ? (messages[state.error]?.[locale] ?? messages.invalid[locale]) : null;

  return (
    <form action={action} className="w-full max-w-sm space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {err && <FormError>{err}</FormError>}

      <Button type="submit" disabled={pending} className="w-full">
        {t('signInButton')}
      </Button>
    </form>
  );
}
