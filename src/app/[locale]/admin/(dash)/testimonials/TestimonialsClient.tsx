'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Testimonial } from '@/lib/supabase/types';
import { deleteTestimonialAction, upsertTestimonialAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, FormError } from '@/components/ui/Field';

const bag = (v: unknown): { vi?: string; en?: string } =>
  v && typeof v === 'object' ? (v as { vi?: string; en?: string }) : {};

type Draft = {
  id?: string;
  author: string;
  role: string;
  vi: string;
  en: string;
  rating: string;
  is_published: boolean;
  sort_order: string;
};
const empty: Draft = { author: '', role: '', vi: '', en: '', rating: '5', is_published: false, sort_order: '0' };

export function TestimonialsClient({ items }: { items: Testimonial[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<Draft>(empty);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await upsertTestimonialAction({
        id: d.id,
        author: d.author,
        role: d.role || null,
        quote: { vi: d.vi, en: d.en },
        rating: d.rating ? Number(d.rating) : null,
        is_published: d.is_published,
        sort_order: Number(d.sort_order) || 0,
      });
      if (!res.ok) return setErr(res.error);
      setD(empty);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="max-w-2xl space-y-3 border border-line p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Author</Label>
            <Input value={d.author} required onChange={(e) => set({ author: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={d.role} onChange={(e) => set({ role: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Quote VI</Label>
            <Textarea rows={3} value={d.vi} onChange={(e) => set({ vi: e.target.value })} />
          </div>
          <div>
            <Label>Quote EN</Label>
            <Textarea rows={3} value={d.en} onChange={(e) => set({ en: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-24">
            <Label>Rating</Label>
            <Input type="number" min={1} max={5} value={d.rating} onChange={(e) => set({ rating: e.target.value })} />
          </div>
          <div className="w-24">
            <Label>Order</Label>
            <Input type="number" value={d.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-bone-dim">
            <input type="checkbox" checked={d.is_published} onChange={(e) => set({ is_published: e.target.checked })} />
            published
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {d.id ? 'Update' : 'Add'}
          </Button>
          {d.id && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setD(empty)}>
              Cancel
            </Button>
          )}
        </div>
        {err && <FormError>{err}</FormError>}
      </form>

      <ul className="divide-y divide-line border-y border-line">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-4 py-3 text-sm">
            <div>
              <p className="text-bone">{it.author} {it.role ? <span className="text-bone-faint">· {it.role}</span> : null}</p>
              <p className="text-bone-dim">“{bag(it.quote).vi || bag(it.quote).en}”</p>
              <p className="text-xs text-bone-faint">{it.is_published ? 'published' : 'draft'} · order {it.sort_order}</p>
            </div>
            <span className="flex shrink-0 gap-3 text-xs uppercase tracking-[0.14em]">
              <button
                className="text-bone-dim hover:text-bone"
                onClick={() =>
                  setD({
                    id: it.id,
                    author: it.author,
                    role: it.role ?? '',
                    vi: bag(it.quote).vi ?? '',
                    en: bag(it.quote).en ?? '',
                    rating: it.rating?.toString() ?? '',
                    is_published: it.is_published,
                    sort_order: String(it.sort_order),
                  })
                }
              >
                edit
              </button>
              <button
                className="text-red-400"
                onClick={() => {
                  if (confirm('Xoá đánh giá?'))
                    start(async () => {
                      const res = await deleteTestimonialAction({ id: it.id });
                      if (res.ok) router.refresh();
                      else setErr(res.error);
                    });
                }}
              >
                del
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
