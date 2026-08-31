'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { StaffRow } from '@/lib/queries/users';
import {
  createAdminAction,
  deleteAdminAction,
  resetAdminMfaAction,
  setAdminActiveAction,
} from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, FormError } from '@/components/ui/Field';

export function UsersClient({ staff, selfId }: { staff: StaffRow[]; selfId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreated(null);
    start(async () => {
      const res = await createAdminAction({ email, full_name: name });
      if (!res.ok) {
        setErr(res.error === 'validation' ? 'Email hoặc tên không hợp lệ.' : res.error);
        return;
      }
      setCreated(res.data as { email: string; password: string });
      setEmail('');
      setName('');
      router.refresh();
    });
  }

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? 'failed');
      else {
        setErr(null);
        router.refresh();
      }
    });

  return (
    <div className="space-y-10">
      <form onSubmit={create} className="max-w-md space-y-4 border border-line p-5">
        <h2 className="kicker">Tạo tài khoản admin (chỉ owner)</h2>
        <div>
          <Label htmlFor="e">Email</Label>
          <Input id="e" type="email" value={email} required onChange={(ev) => setEmail(ev.target.value)} />
        </div>
        <div>
          <Label htmlFor="n">Họ tên</Label>
          <Input id="n" value={name} required onChange={(ev) => setName(ev.target.value)} />
        </div>
        {err && <FormError>{err}</FormError>}
        <Button type="submit" disabled={pending}>
          {pending ? '…' : 'Tạo'}
        </Button>

        {created && (
          <div className="border border-gold/50 bg-gold/5 p-3 text-sm">
            <p className="text-bone">Tài khoản đã tạo. Gửi thông tin này cho admin (hiện 1 lần):</p>
            <p className="mt-2 break-all font-mono text-xs text-bone-dim">
              {created.email}
              <br />
              {created.password}
            </p>
            <p className="mt-2 text-xs text-bone-faint">
              Admin phải bật TOTP ở lần đăng nhập đầu và nên đổi mật khẩu sau đó.
            </p>
          </div>
        )}
      </form>

      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left [&>th]:px-4 [&>th]:py-3">
              <th className="kicker">Email</th>
              <th className="kicker">Name</th>
              <th className="kicker">Role</th>
              <th className="kicker">Active</th>
              <th className="kicker">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const isOwner = s.role === 'owner';
              const isSelf = s.id === selfId;
              return (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="px-4 py-3 text-bone">{s.email}</td>
                  <td className="px-4 py-3 text-bone-dim">{s.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={isOwner ? 'text-gold' : 'text-bone-dim'}>{s.role}</span>
                  </td>
                  <td className="px-4 py-3">{s.is_active ? 'yes' : 'no'}</td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span className="text-bone-faint">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em]">
                        <button
                          className="text-bone-dim hover:text-bone"
                          disabled={pending}
                          onClick={() => act(() => setAdminActiveAction({ id: s.id, is_active: !s.is_active }))}
                        >
                          {s.is_active ? 'disable' : 'enable'}
                        </button>
                        <button
                          className="text-bone-dim hover:text-bone"
                          disabled={pending}
                          onClick={() => act(() => resetAdminMfaAction({ id: s.id }))}
                        >
                          reset 2fa
                        </button>
                        {!isSelf && (
                          <button
                            className="text-red-400"
                            disabled={pending}
                            onClick={() => {
                              if (confirm(`Xoá ${s.email}?`)) act(() => deleteAdminAction({ id: s.id }));
                            }}
                          >
                            delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
