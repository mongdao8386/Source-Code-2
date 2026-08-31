'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Page } from '@/lib/supabase/types';
import { deletePageAction, upsertPageAction } from './actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select, FormError } from '@/components/ui/Field';

const bag = (v: unknown): { vi?: string; en?: string } =>
  v && typeof v === 'object' ? (v as { vi?: string; en?: string }) : {};

export function PagesClient({ pages }: { pages: Page[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<string>(pages[0]?.id ?? 'new');
  const [err, setErr] = useState<string | null>(null);

  const current = pages.find((p) => p.id === sel) ?? null;
  const key = current?.id ?? 'new';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setSel(p.id)}
            className={
              'border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ' +
              (sel === p.id ? 'border-gold text-gold' : 'border-line-strong text-bone-dim')
            }
          >
            {p.slug}
          </button>
        ))}
        <button
          onClick={() => setSel('new')}
          className={
            'border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ' +
            (sel === 'new' ? 'border-gold text-gold' : 'border-line-strong text-bone-dim')
          }
        >
          + new
        </button>
      </div>

      <PageEditor
        key={key}
        page={current}
        pending={pending}
        onErr={setErr}
        onSave={(payload) =>
          start(async () => {
            setErr(null);
            const res = await upsertPageAction(payload);
            if (!res.ok) setErr(res.error === 'validation' ? 'Kiểm tra slug.' : res.error);
            else router.refresh();
          })
        }
        onDelete={
          current
            ? () => {
                if (!confirm('Xoá trang?')) return;
                start(async () => {
                  const res = await deletePageAction({ id: current.id });
                  if (res.ok) {
                    setSel('new');
                    router.refresh();
                  } else setErr(res.error);
                });
              }
            : undefined
        }
      />
      {err && <FormError>{err}</FormError>}
    </div>
  );
}

function PageEditor({
  page,
  pending,
  onSave,
  onDelete,
}: {
  page: Page | null;
  pending: boolean;
  onErr: (s: string | null) => void;
  onSave: (p: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  const title = bag(page?.title);
  const body = bag(page?.body);
  const seo = (page?.seo ?? {}) as Record<string, unknown>;
  const [f, setF] = useState({
    slug: page?.slug ?? '',
    status: page?.status ?? 'draft',
    titleVi: title.vi ?? '',
    titleEn: title.en ?? '',
    bodyVi: body.vi ?? '',
    bodyEn: body.en ?? '',
    seoTitleVi: bag(seo.title).vi ?? '',
    seoTitleEn: bag(seo.title).en ?? '',
    seoDescVi: bag(seo.description).vi ?? '',
    seoDescEn: bag(seo.description).en ?? '',
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: page?.id,
          slug: f.slug,
          status: f.status,
          title: { vi: f.titleVi, en: f.titleEn },
          body: { vi: f.bodyVi, en: f.bodyEn },
          seo: {
            title: { vi: f.seoTitleVi, en: f.seoTitleEn },
            description: { vi: f.seoDescVi, en: f.seoDescEn },
          },
        });
      }}
      className="max-w-3xl space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="ps">Slug</Label>
          <Input id="ps" value={f.slug} required onChange={(e) => set({ slug: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="pst">Status</Label>
          <Select id="pst" value={f.status} onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title VI</Label>
          <Input value={f.titleVi} onChange={(e) => set({ titleVi: e.target.value })} />
        </div>
        <div>
          <Label>Title EN</Label>
          <Input value={f.titleEn} onChange={(e) => set({ titleEn: e.target.value })} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>Body VI (markdown)</Label>
          <Textarea rows={14} value={f.bodyVi} onChange={(e) => set({ bodyVi: e.target.value })} />
        </div>
        <div>
          <Label>Body EN (markdown)</Label>
          <Textarea rows={14} value={f.bodyEn} onChange={(e) => set({ bodyEn: e.target.value })} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '…' : page ? 'Save' : 'Create'}
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="text-red-400" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
