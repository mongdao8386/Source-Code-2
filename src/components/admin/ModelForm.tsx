'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminHref } from '@/lib/admin-path';
import type { Category, Model, ModelDetail } from '@/lib/supabase/types';
import { createModelAction, updateModelAction, deleteModelAction } from '@/app/console/(dash)/models/actions';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select, FormError } from '@/components/ui/Field';

type Bag = { vi?: string; en?: string };
const bag = (v: unknown): Bag => (v && typeof v === 'object' ? (v as Bag) : {});
const rec = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' ? (v as Record<string, string>) : {};

/** Rows arrive as jsonb, so nothing about their shape is guaranteed here. */
const rows = (v: unknown): ModelDetail[] =>
  Array.isArray(v)
    ? v.map((r) => ({
        label: bag((r as ModelDetail)?.label),
        value: bag((r as ModelDetail)?.value),
      }))
    : [];

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ModelForm({
  model,
  categories,
}: {
  model: Model | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const seo = rec(model?.seo);
  const m = rec(model?.measurements);

  const [f, setF] = useState({
    slug: model?.slug ?? '',
    stage_name: model?.stage_name ?? '',
    status: model?.status ?? 'draft',
    height_cm: model?.height_cm?.toString() ?? '',
    city: model?.city ?? '',
    experience_years: model?.experience_years?.toString() ?? '',
    bio: bag(model?.bio),
    display_order: model?.display_order?.toString() ?? '0',
    category_ids: model?.category_ids ?? [],
    bust: m.bust ?? '',
    waist: m.waist ?? '',
    hips: m.hips ?? '',
    shoe: m.shoe ?? '',
    hair: m.hair ?? '',
    eyes: m.eyes ?? '',
    seoTitle: bag((seo as Record<string, unknown>).title),
    seoDesc: bag((seo as Record<string, unknown>).description),
    details: rows(model?.details),
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      slug: f.slug || slugify(f.stage_name),
      stage_name: f.stage_name,
      status: f.status,
      height_cm: f.height_cm ? Number(f.height_cm) : null,
      city: f.city || null,
      experience_years: f.experience_years ? Number(f.experience_years) : null,
      bio: f.bio,
      display_order: Number(f.display_order) || 0,
      category_ids: f.category_ids,
      measurements: {
        bust: f.bust, waist: f.waist, hips: f.hips, shoe: f.shoe, hair: f.hair, eyes: f.eyes,
      },
      seo: { title: f.seoTitle, description: f.seoDesc },
      details: f.details,
    };

    start(async () => {
      const res = model
        ? await updateModelAction({ id: model.id, ...payload })
        : await createModelAction(payload);
      if (!res.ok) {
        setError(res.error === 'validation' ? 'Kiểm tra lại các trường (slug: a-z, số, gạch nối).' : res.error);
        return;
      }
      const id = (res.data as { id?: string })?.id;
      if (!model && id) {
        router.replace(adminHref(`/models/${id}`));
      } else {
        router.refresh();
      }
    });
  }

  function remove() {
    if (!model || !confirm('Xoá người mẫu này? Không thể hoàn tác.')) return;
    start(async () => {
      const res = await deleteModelAction({ id: model.id });
      if (res.ok) router.replace(adminHref('/models'));
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sn">Stage name</Label>
          <Input id="sn" value={f.stage_name} required onChange={(e) => set({ stage_name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="sl">Slug</Label>
          <Input
            id="sl"
            value={f.slug}
            placeholder={slugify(f.stage_name) || 'auto'}
            onChange={(e) => set({ slug: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="st">Status</Label>
          <Select id="st" value={f.status} onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ord">Display order</Label>
          <Input id="ord" type="number" value={f.display_order} onChange={(e) => set({ display_order: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="h">Height (cm)</Label>
          <Input id="h" type="number" value={f.height_cm} onChange={(e) => set({ height_cm: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="c">City</Label>
          <Input id="c" value={f.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="ey">Experience (years)</Label>
          <Input id="ey" type="number" value={f.experience_years} onChange={(e) => set({ experience_years: e.target.value })} />
        </div>
      </div>

      <fieldset>
        <legend className="kicker mb-2">Categories</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const on = f.category_ids.includes(cat.id);
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() =>
                  set({
                    category_ids: on
                      ? f.category_ids.filter((x) => x !== cat.id)
                      : [...f.category_ids, cat.id],
                  })
                }
                className={
                  'border px-3 py-1.5 text-xs uppercase tracking-[0.14em] ' +
                  (on ? 'border-gold text-gold' : 'border-line-strong text-bone-dim')
                }
              >
                {rec(cat.name).vi || rec(cat.name).en || cat.slug}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['bust', 'waist', 'hips', 'shoe', 'hair', 'eyes'] as const).map((k) => (
          <div key={k}>
            <Label htmlFor={k}>{k}</Label>
            <Input id={k} value={f[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<typeof f>)} />
          </div>
        ))}
      </div>

      <DetailRows value={f.details} onChange={(details) => set({ details })} />

      <TwoLang label="Bio" value={f.bio} onChange={(bio) => set({ bio })} textarea />
      <TwoLang label="SEO title" value={f.seoTitle} onChange={(seoTitle) => set({ seoTitle })} />
      <TwoLang label="SEO description" value={f.seoDesc} onChange={(seoDesc) => set({ seoDesc })} textarea />

      {error && <FormError>{error}</FormError>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? '…' : model ? 'Save' : 'Create'}
        </Button>
        {model && (
          <Button type="button" variant="ghost" onClick={remove} disabled={pending} className="text-red-400">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

function TwoLang({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: Bag;
  onChange: (v: Bag) => void;
  textarea?: boolean;
}) {
  const C = textarea ? Textarea : Input;
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <C
          placeholder="VI"
          value={value.vi ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, vi: e.target.value })
          }
        />
        <C
          placeholder="EN"
          value={value.en ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })
          }
        />
      </div>
    </div>
  );
}

/**
 * Free-form spec rows. Anything the fixed columns above do not cover goes here
 * and lands on the public page in this order — so a new fact is a CMS edit, not
 * a migration. Rows left blank or half-filled are dropped server-side, so an
 * abandoned row can simply be saved over.
 */
function DetailRows({
  value,
  onChange,
}: {
  value: ModelDetail[];
  onChange: (v: ModelDetail[]) => void;
}) {
  const patch = (i: number, p: Partial<ModelDetail>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="kicker mb-2">Thông tin chi tiết thêm</legend>
      <p className="mb-4 text-xs text-bone-faint">
        Hiện dưới phần thông số trên trang người mẫu, theo đúng thứ tự ở đây.
        Dòng để trống sẽ bị bỏ qua.
      </p>

      <div className="space-y-4">
        {value.map((row, i) => (
          <div key={i} className="border border-line-strong p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label={`Nhãn VI (dòng ${i + 1})`}
                placeholder="Nhãn · VI"
                value={row.label.vi ?? ''}
                onChange={(e) => patch(i, { label: { ...row.label, vi: e.target.value } })}
              />
              <Input
                aria-label={`Label EN (row ${i + 1})`}
                placeholder="Label · EN"
                value={row.label.en ?? ''}
                onChange={(e) => patch(i, { label: { ...row.label, en: e.target.value } })}
              />
              <Input
                aria-label={`Giá trị VI (dòng ${i + 1})`}
                placeholder="Giá trị · VI"
                value={row.value.vi ?? ''}
                onChange={(e) => patch(i, { value: { ...row.value, vi: e.target.value } })}
              />
              <Input
                aria-label={`Value EN (row ${i + 1})`}
                placeholder="Value · EN"
                value={row.value.en ?? ''}
                onChange={(e) => patch(i, { value: { ...row.value, en: e.target.value } })}
              />
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs uppercase tracking-[0.14em]">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-bone-dim hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
              >
                ↑ Lên
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                className="text-bone-dim hover:text-gold disabled:opacity-30 disabled:hover:text-bone-dim"
              >
                ↓ Xuống
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                Xoá dòng
              </button>
            </div>
          </div>
        ))}
      </div>

      {value.length < 30 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={value.length ? 'mt-4' : ''}
          onClick={() => onChange([...value, { label: {}, value: {} }])}
        >
          + Thêm dòng
        </Button>
      )}
    </fieldset>
  );
}
