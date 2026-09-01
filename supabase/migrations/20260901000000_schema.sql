-- ============================================================================
-- 20260901000000_schema.sql — the whole database, in one file.
--
-- Squashes what used to be five migrations (init, public settings view,
-- deletable staff, settings column grants, branding). Applying them one at a
-- time left the database in a half-state more than once, so this is now the
-- single source of truth for a deploy.
--
-- Schema and starter data both live here so a deploy is a single paste.
--
-- Written to be idempotent: safe on an empty project and safe to re-run on a
-- database that already has some or all of it. Every insert is guarded by
-- ON CONFLICT DO NOTHING, so re-running never overwrites content you have
-- since edited in the CMS.
--
-- Bilingual text is jsonb: { "vi": "...", "en": "..." }
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.staff_role as enum ('owner', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

-- ─── tables ─────────────────────────────────────────────────────────────────
-- One row per staff member. Site visitors never get a row: the public site has
-- no user accounts at all.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.staff_role not null default 'admin',
  full_name     text not null default '',
  is_active     boolean not null default true,
  created_by    uuid,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.models (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  stage_name       text not null,
  status           public.content_status not null default 'draft',
  cover_photo_id   uuid,
  height_cm        integer check (height_cm is null or height_cm between 120 and 230),
  measurements     jsonb not null default '{}'::jsonb,
  city             text,
  experience_years integer check (experience_years is null or experience_years between 0 and 60),
  bio              jsonb not null default '{}'::jsonb,
  category_ids     uuid[] not null default '{}',
  display_order    integer not null default 0,
  seo              jsonb not null default '{}'::jsonb,
  created_by       uuid,
  updated_by       uuid,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists models_status_idx on public.models (status);
create index if not exists models_display_order_idx on public.models (display_order);
create index if not exists models_category_ids_idx on public.models using gin (category_ids);

create table if not exists public.model_photos (
  id           uuid primary key default gen_random_uuid(),
  model_id     uuid not null references public.models (id) on delete cascade,
  storage_path text not null,
  width        integer,
  height       integer,
  alt          jsonb not null default '{}'::jsonb,
  sort_order   integer not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists model_photos_model_id_idx on public.model_photos (model_id, sort_order);

create table if not exists public.pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      jsonb not null default '{}'::jsonb,
  body       jsonb not null default '{}'::jsonb,
  status     public.content_status not null default 'draft',
  seo        jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  author       text not null,
  role         text,
  quote        jsonb not null default '{}'::jsonb,
  avatar_path  text,
  rating       integer check (rating is null or rating between 1 and 5),
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Enforced singleton: the primary key is a boolean that must be true.
create table if not exists public.site_settings (
  id                   boolean primary key default true,
  telegram_channel_url text not null default '',
  contact_email        text not null default '',
  phone                text not null default '',
  socials              jsonb not null default '{}'::jsonb,
  -- { headline:{vi,en}, sub:{vi,en}, image } — note `image` is a bare path,
  -- not a bilingual bag.
  hero                 jsonb not null default '{}'::jsonb,
  announcement         jsonb not null default '{}'::jsonb,
  maintenance_mode     boolean not null default false,
  brand_name           text not null default 'STUDIO',
  logo_path            text not null default '',
  favicon_path         text not null default '',
  og_image_path        text not null default '',
  accent_color         text not null default '#c8a253',
  updated_by           uuid,
  updated_at           timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

create table if not exists public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token_hash  text not null,
  role        public.staff_role not null default 'admin',
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_by  uuid not null,
  created_at  timestamptz not null default now()
);
create index if not exists admin_invites_email_idx on public.admin_invites (lower(email));

create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  -- Denormalised so the trail stays attributable after the account is deleted
  -- and actor_id becomes null.
  actor_email text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  meta        jsonb not null default '{}'::jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- Anonymous "Đặt lịch" counter. Deliberately holds no personal data.
create table if not exists public.click_events (
  id         bigint generated always as identity primary key,
  kind       text not null default 'booking',
  model_id   uuid references public.models (id) on delete set null,
  locale     text,
  created_at timestamptz not null default now()
);
create index if not exists click_events_created_at_idx on public.click_events (created_at desc);

-- Columns added after the first release; listed separately so this file also
-- upgrades a database created from an older version.
alter table public.audit_logs    add column if not exists actor_email   text;

-- One short intro clip per model. Kept on the row rather than in its own table
-- because the cap is a single 15s reel, not a gallery. Duration is recorded for
-- display only — it is reported by the browser that did the trim, so the real
-- guard is the byte cap enforced server-side on upload.
alter table public.models add column if not exists video_path        text not null default '';
alter table public.models add column if not exists video_poster_path text not null default '';
alter table public.models add column if not exists video_duration    numeric;
alter table public.site_settings add column if not exists brand_name    text not null default 'STUDIO';
alter table public.site_settings add column if not exists logo_path     text not null default '';
alter table public.site_settings add column if not exists favicon_path  text not null default '';
alter table public.site_settings add column if not exists og_image_path text not null default '';
alter table public.site_settings add column if not exists accent_color  text not null default '#c8a253';

-- accent_color ends up inside a CSS custom property, so it is constrained here
-- as well as in the form.
alter table public.site_settings drop constraint if exists site_settings_accent_hex;
alter table public.site_settings
  add constraint site_settings_accent_hex
  check (accent_color ~ '^#[0-9a-fA-F]{6}$');

-- ============================================================================
-- Foreign keys
--
-- Every reference to profiles needs an explicit ON DELETE. Without one they
-- default to NO ACTION, and deleting an auth user (which cascades into
-- profiles) is then blocked by anything that person authored — meaning no
-- staff member who had ever signed in could be removed.
-- ============================================================================
alter table public.models drop constraint if exists models_cover_photo_fk;
alter table public.models
  add constraint models_cover_photo_fk
  foreign key (cover_photo_id) references public.model_photos (id) on delete set null;

alter table public.profiles drop constraint if exists profiles_created_by_fkey;
alter table public.profiles
  add constraint profiles_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.models drop constraint if exists models_created_by_fkey;
alter table public.models
  add constraint models_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.models drop constraint if exists models_updated_by_fkey;
alter table public.models
  add constraint models_updated_by_fkey
  foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.pages drop constraint if exists pages_updated_by_fkey;
alter table public.pages
  add constraint pages_updated_by_fkey
  foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.site_settings drop constraint if exists site_settings_updated_by_fkey;
alter table public.site_settings
  add constraint site_settings_updated_by_fkey
  foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.audit_logs drop constraint if exists audit_logs_actor_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
  foreign key (actor_id) references public.profiles (id) on delete set null;

-- Invitations are meaningless once their author is gone.
alter table public.admin_invites drop constraint if exists admin_invites_created_by_fkey;
alter table public.admin_invites
  add constraint admin_invites_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete cascade;

-- ============================================================================
-- Helper functions
-- ============================================================================
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active);
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = 'owner'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','models','pages','testimonials','site_settings']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- Blocks privilege escalation: nobody edits their own role or active flag,
-- role changes require the owner, and the owner cannot be demoted.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner' and auth.uid() is not null and not public.is_owner() then
      raise exception 'only the owner may grant the owner role';
    end if;
    return new;
  end if;

  if auth.uid() is not null then
    if new.id = auth.uid() and (new.role <> old.role or new.is_active <> old.is_active) then
      raise exception 'cannot change your own role or active flag';
    end if;
    if new.role <> old.role and not public.is_owner() then
      raise exception 'only the owner may change roles';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      raise exception 'the owner role cannot be demoted';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.models        enable row level security;
alter table public.model_photos  enable row level security;
alter table public.pages         enable row level security;
alter table public.testimonials  enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_invites enable row level security;
alter table public.audit_logs    enable row level security;
alter table public.click_events  enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_owner());

drop policy if exists profiles_owner_write on public.profiles;
create policy profiles_owner_write on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists models_public_read on public.models;
create policy models_public_read on public.models
  for select using (status = 'published' or public.is_staff());

drop policy if exists models_staff_write on public.models;
create policy models_staff_write on public.models
  for all using (public.is_staff()) with check (public.is_staff());

-- Photos are visible exactly when their parent model is.
drop policy if exists model_photos_public_read on public.model_photos;
create policy model_photos_public_read on public.model_photos
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.models m
      where m.id = model_photos.model_id and m.status = 'published'
    )
  );

drop policy if exists model_photos_staff_write on public.model_photos;
create policy model_photos_staff_write on public.model_photos
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists pages_public_read on public.pages;
create policy pages_public_read on public.pages
  for select using (status = 'published' or public.is_staff());

drop policy if exists pages_staff_write on public.pages;
create policy pages_staff_write on public.pages
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials
  for select using (is_published or public.is_staff());

drop policy if exists testimonials_staff_write on public.testimonials;
create policy testimonials_staff_write on public.testimonials
  for all using (public.is_staff()) with check (public.is_staff());

-- site_settings is split by role rather than by column policy, because CMS
-- staff are the `authenticated` role and legitimately read the whole row:
--   anon          -> all rows, but only the public columns (grants below)
--   authenticated -> staff only, all columns
-- A signed-in non-staff user therefore matches no policy and sees nothing.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon using (true);

drop policy if exists site_settings_staff_read on public.site_settings;
create policy site_settings_staff_read on public.site_settings
  for select to authenticated using (public.is_staff());

drop policy if exists site_settings_staff_write on public.site_settings;
create policy site_settings_staff_write on public.site_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists admin_invites_owner on public.admin_invites;
create policy admin_invites_owner on public.admin_invites
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists audit_logs_staff_read on public.audit_logs;
create policy audit_logs_staff_read on public.audit_logs
  for select using (public.is_staff());

drop policy if exists click_events_insert on public.click_events;
create policy click_events_insert on public.click_events for insert with check (true);

drop policy if exists click_events_staff_read on public.click_events;
create policy click_events_staff_read on public.click_events
  for select using (public.is_staff());

-- ============================================================================
-- Column privileges
--
-- RLS answers "which rows"; column privileges answer "which columns". This is
-- what keeps contact_email and phone away from anon, and it holds even if the
-- view below is later edited by mistake — which is why the view does not need
-- SECURITY DEFINER (and why the Supabase linter no longer flags it).
-- ============================================================================
revoke select on public.site_settings from anon;
grant select (
  -- `id` is needed because the view's `where id` predicate reads it. Without
  -- it, selecting from the (security_invoker) view fails with "permission
  -- denied for table site_settings" — the predicate touches a column the
  -- caller cannot read. It leaks nothing: the singleton constraint means this
  -- column is always true.
  id,
  telegram_channel_url,
  socials,
  hero,
  announcement,
  maintenance_mode,
  brand_name,
  logo_path,
  favicon_path,
  og_image_path,
  accent_color
) on public.site_settings to anon;

-- Staff need the whole row; the staff policy is what restricts this.
grant select on public.site_settings to authenticated;

-- ============================================================================
-- Public projection
-- ============================================================================
drop view if exists public.public_site_settings;

create view public.public_site_settings
with (security_invoker = true)
as
  select
    telegram_channel_url,
    socials,
    hero,
    announcement,
    maintenance_mode,
    brand_name,
    logo_path,
    favicon_path,
    og_image_path,
    accent_color
  from public.site_settings
  where id;

comment on view public.public_site_settings is
  'Safe public projection of site_settings. Invoker rights: anon holds column '
  'privileges on these columns only, so contact_email and phone stay '
  'unreadable even if this definition is later changed by mistake.';

revoke all on public.public_site_settings from public;
grant select on public.public_site_settings to anon, authenticated;

-- ============================================================================
-- Storage
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('models-public', 'models-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('models-private', 'models-private', false)
on conflict (id) do nothing;

drop policy if exists "public bucket read" on storage.objects;
create policy "public bucket read"
  on storage.objects for select
  using (bucket_id = 'models-public');

drop policy if exists "staff upload public bucket" on storage.objects;
create policy "staff upload public bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff modify public bucket" on storage.objects;
create policy "staff modify public bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff delete public bucket" on storage.objects;
create policy "staff delete public bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff all private bucket" on storage.objects;
create policy "staff all private bucket"
  on storage.objects for all to authenticated
  using (bucket_id = 'models-private' and public.is_staff())
  with check (bucket_id = 'models-private' and public.is_staff());

-- ============================================================================
-- Starter data
--
-- The owner account is deliberately not here: it needs an auth.users row, which
-- only the service role can create. Run `npm run seed:owner` for that.
-- ============================================================================

insert into public.site_settings (id, hero, announcement)
values (
  true,
  jsonb_build_object(
    'headline', jsonb_build_object('vi', 'Gương mặt cho khung hình của bạn', 'en', 'Faces for your frame'),
    'sub', jsonb_build_object(
      'vi', 'Tuyển chọn người mẫu chụp ảnh chuyên nghiệp.',
      'en', 'A curated roster of photographic models.'
    ),
    'image', ''
  ),
  jsonb_build_object('enabled', false, 'text', jsonb_build_object('vi', '', 'en', ''))
)
on conflict (id) do nothing;

insert into public.categories (slug, name, sort_order) values
  ('thoi-trang', jsonb_build_object('vi', 'Thời trang', 'en', 'Fashion'), 1),
  ('beauty',     jsonb_build_object('vi', 'Beauty',     'en', 'Beauty'),  2),
  ('ky-yeu',     jsonb_build_object('vi', 'Kỷ yếu',     'en', 'Yearbook'), 3),
  ('su-kien',    jsonb_build_object('vi', 'Sự kiện',    'en', 'Events'),  4),
  ('thuong-mai', jsonb_build_object('vi', 'Thương mại', 'en', 'Commercial'), 5)
on conflict (slug) do nothing;

-- Published on purpose: the header and footer always link to these three, so
-- shipping them as drafts would leave a fresh install 404-ing its own nav.
-- Replace the placeholder copy from the CMS (Trang nội dung).
insert into public.pages (slug, title, body, status) values
  ('about',
   jsonb_build_object('vi', 'Về chúng tôi', 'en', 'About us'),
   jsonb_build_object('vi', E'## Về chúng tôi\n\nNội dung đang được cập nhật.', 'en', E'## About us\n\nContent coming soon.'),
   'published'),
  ('terms',
   jsonb_build_object('vi', 'Điều khoản', 'en', 'Terms'),
   jsonb_build_object('vi', E'## Điều khoản sử dụng\n\nNội dung đang được cập nhật.', 'en', E'## Terms of use\n\nContent coming soon.'),
   'published'),
  ('guide',
   jsonb_build_object('vi', 'Hướng dẫn', 'en', 'Guide'),
   jsonb_build_object('vi', E'## Hướng dẫn đặt lịch\n\n1. Chọn người mẫu.\n2. Nhấn **Đặt lịch**.\n3. Trao đổi chi tiết qua Telegram.', 'en', E'## How to book\n\n1. Pick a model.\n2. Tap **Book**.\n3. Sort out the details on Telegram.'),
   'published')
on conflict (slug) do nothing;
