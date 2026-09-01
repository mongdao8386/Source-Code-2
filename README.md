# Studio — Model booking site + CMS

Dark-luxury, bilingual (VI/EN) portfolio for photographic models. The public
site is a curated gallery; the only conversion action is **Đặt lịch**, which
opens a shared Telegram channel. A self-hosted CMS manages everything.

## Stack

- **Next.js 15** (App Router, RSC) · TypeScript · Tailwind v4
- **Supabase** — Postgres + Auth (email + TOTP) + Storage; all access via RLS
- **next-intl** — locale-prefixed routes, localised path segments
- **Docker Compose** — `web` (standalone Next) + `caddy` (TLS) + `redis` (rate limit)
- Deploy target: **Hostinger VPS + domain** (see [`deploy/README.md`](deploy/README.md))

## Security model

| Concern | Mechanism |
|---|---|
| CMS is invisible to visitors | middleware returns a plain **404** for `/admin/*` unless the caller is active staff |
| Second factor | TOTP enforced — `aal2` required past `/admin/login` and `/admin/mfa` |
| One owner, owner-creates-admins | `profiles.role` + DB trigger blocking self-elevation / second owner; owner-only server actions |
| Row access | RLS on every table; public reads limited to published rows; a `public_site_settings` view hides contact fields |
| Mutations | every CMS write: role check → Zod → RLS-scoped query → audit row |
| Uploads | magic-byte sniff → `sharp` auto-orient (EXIF stripped) → WebP re-encode → size cap |
| Free-form CMS fields | `models.details` is jsonb, but every row is Zod-checked on write and re-checked on read — a label is never trusted to be a string |
| Headers | nonce CSP + HSTS + `X-Frame-Options: DENY` (middleware + Caddy) |
| Brute force | Redis/in-memory fixed-window limiter on login + MFA |
| Secrets | `service_role` key server-only (`src/lib/supabase/admin.ts`), never bundled |

## Local development

```bash
npm install
cp .env.example .env         # fill Supabase URL + anon + service_role keys
npx supabase db push         # applies supabase/migrations/ (schema + starter data)
npm run seed:owner           # create the owner (see deploy/README.md for vars)
npm run dev                  # http://localhost:3000  → redirects to /vi
```

## Project layout

```
src/
  middleware.ts            locale routing + /admin 404-cloak + CSP
  i18n/                    routing, request config, typed navigation
  messages/                vi.json · en.json (static UI strings)
  lib/
    supabase/              server · client · admin(service role) · anon · middleware
    auth/                  guards (requireStaff/requireOwner) · actions (login/MFA)
    cms/action.ts          cmsAction() wrapper: role → zod → handler → audit
    queries/               public · admin · users read layers
    security/csp.ts        per-request nonce CSP
    ratelimit.ts           Redis or in-memory
  components/
    ui/ site/ admin/
  app/[locale]/
    (site)/                home · models · models/[slug] · about · terms · guide
    admin/
      login · mfa
      (dash)/              dashboard · models · categories · pages
                           · testimonials · settings · users(owner) · audit
  app/api/
    health · track/booking · admin/photos
supabase/migrations/       one idempotent file: schema, RLS, triggers, storage,
                           column grants and starter data
deploy/                     VPS runbook + pg_dump backup
```

## Commands

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production build (standalone) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | apply Supabase migrations |
| `npm run seed:owner` | create the single owner account |
| `docker compose up -d --build` | full stack behind Caddy |

## Regenerating DB types

`src/lib/supabase/types.ts` is hand-authored to match the migration. After a
schema change, prefer:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```
