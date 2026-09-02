'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/supabase/types';
import { deleteCategoryAction, upsertCategoryAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, FormError } from '@/components/ui/Field';
import { TranslateButton } from '@/components/admin/TranslateButton';

const rec = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' ? (v as Record<string, string>) : {};

type Draft = { id?: string; slug: string; vi: string; en: string; sort_order: string };
const empty: Draft = { slug: '', vi: '', en: '', sort_order: '0' };

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(empty);
  const [err, setErr] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await upsertCategoryAction({
        id: draft.id,
        slug: draft.slug,
        name: { vi: draft.vi, en: draft.en },
        sort_order: Number(draft.sort_order) || 0,
      });
      if (!res.ok) return setErr(res.error === 'validation' ? 'slug: a-z, số, gạch nối' : res.error);
      setDraft(empty);
      router.refresh();
    });
  }

  function edit(c: Category) {
    const n = rec(c.name);
    setDraft({ id: c.id, slug: c.slug, vi: n.vi ?? '', en: n.en ?? '', sort_order: String(c.sort_order) });
  }

  function del(id: string) {
    if (!confirm('Xoá thể loại?')) return;
    start(async () => {
      const res = await deleteCategoryAction({ id });
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="grid max-w-2xl gap-3 border border-line p-4 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <Label htmlFor="cs">Slug</Label>
          <Input id="cs" value={draft.slug} required onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="cv">Tên VI</Label>
          <Input id="cv" value={draft.vi} onChange={(e) => setDraft({ ...draft, vi: e.target.value })} />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="ce">Tên EN</Label>
            <TranslateButton
              source={draft.vi}
              target={draft.en}
              onResult={(en) => setDraft({ ...draft, en })}
            />
          </div>
          <Input id="ce" value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="co">Order</Label>
          <Input id="co" type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
        </div>
        <div className="sm:col-span-4 flex gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {draft.id ? 'Update' : 'Add'}
          </Button>
          {draft.id && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(empty)}>
              Cancel
            </Button>
          )}
        </div>
        {err && <div className="sm:col-span-4"><FormError>{err}</FormError></div>}
      </form>

      <ul className="divide-y divide-line border-y border-line">
        {categories.map((c) => {
          const n = rec(c.name);
          return (
            <li key={c.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="text-bone">{n.vi || n.en || c.slug}</span>
                <span className="ml-3 text-bone-faint">{c.slug} · {c.sort_order}</span>
              </span>
              <span className="flex gap-4 text-xs uppercase tracking-[0.14em]">
                <button className="text-bone-dim hover:text-bone" onClick={() => edit(c)}>edit</button>
                <button className="text-red-400" onClick={() => del(c.id)}>del</button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
