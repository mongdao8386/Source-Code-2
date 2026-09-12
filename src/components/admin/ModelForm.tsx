'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminHref } from '@/lib/admin-path';
import type { Category, Model, ModelDetail } from '@/lib/supabase/types';
import { createModelAction, updateModelAction, deleteModelAction } from '@/app/console/(dash)/models/actions';
import { Button } from '@/components/ui/Button';
import { TwoLang } from './TwoLang';
import { DetailRows } from './DetailRows';
import { TemplateTools } from './TemplateTools';
import { Input, Label, Select, FormError } from '@/components/ui/Field';
import { fold, slugify, type ParsedModel } from '@/lib/model-template';

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

  /**
   * Fill the form from pasted text. Only what the paste actually says is
   * written; a blank template line leaves the field as it was. The slug is
   * kept once a model exists — it is the public URL — unless the paste names
   * one outright. Detail rows with the same label are replaced, new ones
   * appended, so pasting an updated block does not double up the list.
   */
  function applyParsed(p: ParsedModel) {
    const explicitSlug = p.slug && p.slug !== slugify(p.stage_name) ? p.slug : '';
    const details = [...f.details];
    for (const r of p.details) {
      const i = details.findIndex((d) => fold(d.label.vi ?? '') === fold(r.label.vi ?? ''));
      if (i >= 0) details[i] = { label: { ...details[i]!.label, ...r.label }, value: r.value };
      else details.push(r);
    }
    set({
      stage_name: p.stage_name || f.stage_name,
      slug: explicitSlug || (model ? f.slug : p.slug || f.slug),
      status: p.status ?? f.status,
      display_order: p.display_order != null ? String(p.display_order) : f.display_order,
      height_cm: p.height_cm != null ? String(p.height_cm) : f.height_cm,
      city: p.city ?? f.city,
      experience_years:
        p.experience_years != null ? String(p.experience_years) : f.experience_years,
      bust: p.bust || f.bust,
      waist: p.waist || f.waist,
      hips: p.hips || f.hips,
      shoe: p.shoe || f.shoe,
      hair: p.hair || f.hair,
      eyes: p.eyes || f.eyes,
      bio: p.bio ? { ...f.bio, vi: p.bio } : f.bio,
      category_ids: p.category_ids.length ? p.category_ids : f.category_ids,
      details,
    });
  }

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
      <TemplateTools
        value={{ ...f, bio: f.bio.vi ?? '' }}
        categories={categories}
        onApply={applyParsed}
      />

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
