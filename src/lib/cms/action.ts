import 'server-only';

import { z } from 'zod';
import { requireOwner, requireStaff, type SessionStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';

export type CmsResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Handler<S extends z.ZodTypeAny, T> = (args: {
  input: z.infer<S>;
  staff: SessionStaff;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) => Promise<CmsResult<T>>;

/**
 * Wraps a CMS mutation with: role check → zod validation → handler →
 * best-effort audit. The handler still runs under RLS (staff-scoped client),
 * so an authorisation mistake here fails closed at the database.
 */
export function cmsAction<S extends z.ZodTypeAny, T>(opts: {
  schema: S;
  owner?: boolean;
  action: string;
  entity: string;
  handler: Handler<S, T>;
}) {
  return async (raw: unknown): Promise<CmsResult<T>> => {
    const staff = opts.owner ? await requireOwner() : await requireStaff();

    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'validation',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const supabase = await createClient();
    const result = await opts.handler({ input: parsed.data, staff, supabase });

    if (result.ok) {
      await audit({
        actorId: staff.userId,
        action: opts.action,
        entity: opts.entity,
        entityId:
          (result.data as { id?: string } | undefined)?.id ??
          (parsed.data as { id?: string }).id ??
          null,
        meta: { role: staff.profile.role },
      }).catch(() => {});
    }
    return result;
  };
}

/** Small helpers shared by schemas. */
export const i18nString = z
  .object({ vi: z.string().max(20000).optional(), en: z.string().max(20000).optional() })
  .default({});

export const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug-format');
