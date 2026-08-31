-- ============================================================================
-- 0001_init.sql — schema, helper functions, RLS, triggers
-- Bilingual text is stored as jsonb: { "vi": "...", "en": "..." }
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── enums ──────────────────────────────────────────────────────────────────
create type public.staff_role as enum ('owner', 'admin');
create type public.content_status as enum ('draft', 'published');

-- ─── profiles: one row per staff member (no rows for site visitors) ─────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.staff_role not null default 'admin',
  full_name     text not null default '',
  is_active     boolean not null default true,
  created_by    uuid references public.profiles (id),
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── categories ────────────────────────────────────────────────────────────
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── models ────────────────────────────────────────────────────────────────
create table public.models (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  stage_name       text not null,
  status           public.content_status not null default 'draft',
  cover_photo_id   uuid,
  height_cm        integer check (height_cm is null or height_cm between 120 and 230),
  measurements     jsonb not null default '{}'::jsonb,   -- { bust, waist, hips, shoe, hair, eyes }
  city             text,
  experience_years integer check (experience_years is null or experience_years between 0 and 60),
  bio              jsonb not null default '{}'::jsonb,
  category_ids     uuid[] not null default '{}',
  display_order    integer not null default 0,
  seo              jsonb not null default '{}'::jsonb,    -- { title:{vi,en}, description:{vi,en} }
  created_by       uuid references public.profiles (id),
  updated_by       uuid references public.profiles (id),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index models_status_idx on public.models (status);
create index models_display_order_idx on public.models (display_order);
create index models_category_ids_idx on public.models using gin (category_ids);

-- ─── model_photos ──────────────────────────────────────────────────────────
create table public.model_photos (
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
create index model_photos_model_id_idx on public.model_photos (model_id, sort_order);

alter table public.models
  add constraint models_cover_photo_fk
  foreign key (cover_photo_id) references public.model_photos (id) on delete set null;

-- ─── pages (about / terms / guide …) ───────────────────────────────────────
create table public.pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      jsonb not null default '{}'::jsonb,
  body       jsonb not null default '{}'::jsonb,   -- { vi: "markdown", en: "markdown" }
  status     public.content_status not null default 'draft',
  seo        jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── testimonials ──────────────────────────────────────────────────────────
create table public.testimonials (
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

-- ─── site_settings: enforced singleton ─────────────────────────────────────
create table public.site_settings (
  id                  boolean primary key default true,
  telegram_channel_url text not null default '',
  contact_email       text not null default '',
  phone               text not null default '',
  socials             jsonb not null default '{}'::jsonb,
  hero                jsonb not null default '{}'::jsonb,   -- { headline:{vi,en}, sub:{vi,en}, image }
  announcement        jsonb not null default '{}'::jsonb,   -- { enabled, text:{vi,en} }
  maintenance_mode    boolean not null default false,
  updated_by          uuid references public.profiles (id),
  updated_at          timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

-- ─── admin_invites ─────────────────────────────────────────────────────────
create table public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token_hash  text not null,
  role        public.staff_role not null default 'admin',
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index admin_invites_email_idx on public.admin_invites (lower(email));

-- ─── audit_logs ────────────────────────────────────────────────────────────
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb not null default '{}'::jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ─── click_events: anonymous "Đặt lịch" analytics, no PII ──────────────────
create table public.click_events (
  id         bigint generated always as identity primary key,
  kind       text not null default 'booking',
  model_id   uuid references public.models (id) on delete set null,
  locale     text,
  created_at timestamptz not null default now()
);
create index click_events_created_at_idx on public.click_events (created_at desc);

-- ============================================================================
-- helper functions
-- ============================================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = 'owner'
  );
$$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','models','pages','testimonials','site_settings'
  ]
  loop
    execute format(
      'create trigger %I_touch before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- prevent privilege escalation on profiles
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- a second owner can only be created by the service role (auth.uid() is null)
    if new.role = 'owner' and auth.uid() is not null and not public.is_owner() then
      raise exception 'only the owner may grant the owner role';
    end if;
    return new;
  end if;

  -- UPDATE: nobody edits their own role or is_active; role changes need owner
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

create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- ============================================================================
-- public read view for settings (no contact_email / phone exposure)
-- ============================================================================
create view public.public_site_settings
with (security_invoker = true)
as
  select telegram_channel_url, socials, hero, announcement, maintenance_mode
  from public.site_settings
  where id;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.models         enable row level security;
alter table public.model_photos   enable row level security;
alter table public.pages          enable row level security;
alter table public.testimonials   enable row level security;
alter table public.site_settings  enable row level security;
alter table public.admin_invites  enable row level security;
alter table public.audit_logs     enable row level security;
alter table public.click_events   enable row level security;

-- profiles
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy profiles_owner_write on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- categories: world-readable, staff-writable
create policy categories_read on public.categories
  for select using (true);
create policy categories_write on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

-- models
create policy models_public_read on public.models
  for select using (status = 'published' or public.is_staff());
create policy models_staff_write on public.models
  for all using (public.is_staff()) with check (public.is_staff());

-- model_photos: visible when the parent model is visible
create policy model_photos_public_read on public.model_photos
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.models m
      where m.id = model_photos.model_id and m.status = 'published'
    )
  );
create policy model_photos_staff_write on public.model_photos
  for all using (public.is_staff()) with check (public.is_staff());

-- pages
create policy pages_public_read on public.pages
  for select using (status = 'published' or public.is_staff());
create policy pages_staff_write on public.pages
  for all using (public.is_staff()) with check (public.is_staff());

-- testimonials
create policy testimonials_public_read on public.testimonials
  for select using (is_published or public.is_staff());
create policy testimonials_staff_write on public.testimonials
  for all using (public.is_staff()) with check (public.is_staff());

-- site_settings: full row for staff only (public uses the view)
create policy site_settings_staff_read on public.site_settings
  for select using (public.is_staff());
create policy site_settings_staff_write on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- admin_invites: owner only (writes normally go through service role)
create policy admin_invites_owner on public.admin_invites
  for all using (public.is_owner()) with check (public.is_owner());

-- audit_logs: staff can read; inserts happen via service role
create policy audit_logs_staff_read on public.audit_logs
  for select using (public.is_staff());

-- click_events: anyone may insert one event; staff may read aggregates
create policy click_events_insert on public.click_events
  for insert with check (true);
create policy click_events_staff_read on public.click_events
  for select using (public.is_staff());

-- ============================================================================
-- Storage buckets + policies
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('models-public', 'models-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('models-private', 'models-private', false)
on conflict (id) do nothing;

create policy "public bucket read"
  on storage.objects for select
  using (bucket_id = 'models-public');

create policy "staff upload public bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'models-public' and public.is_staff());

create policy "staff modify public bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

create policy "staff delete public bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

create policy "staff all private bucket"
  on storage.objects for all to authenticated
  using (bucket_id = 'models-private' and public.is_staff())
  with check (bucket_id = 'models-private' and public.is_staff());
