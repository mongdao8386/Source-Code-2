-- ============================================================================
-- 20260831000003_deletable_staff.sql
--
-- Fix: removing a staff member failed with "Database error deleting user".
--
-- Seven foreign keys point at public.profiles and none declared an ON DELETE
-- action, so they defaulted to NO ACTION. Deleting an auth.users row cascades
-- into profiles, that delete is then blocked by any content the person
-- authored or any audit row they generated — which is every staff member who
-- has ever signed in. In practice no admin could ever be removed, breaking the
-- owner's ability to revoke access.
--
-- Content and audit history must outlive the account, so those references
-- become ON DELETE SET NULL. Pending invitations are meaningless once their
-- creator is gone, so they cascade.
--
-- Accountability is preserved separately: audit_logs gains a denormalised
-- actor_email that survives the account it refers to. Without it, deleting a
-- staff member would quietly anonymise everything they ever did.
-- ============================================================================

-- ─── audit_logs.actor_id ───────────────────────────────────────────────────
alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey,
  add constraint audit_logs_actor_id_fkey
    foreign key (actor_id) references public.profiles (id) on delete set null;

alter table public.audit_logs
  add column if not exists actor_email text;

comment on column public.audit_logs.actor_email is
  'Denormalised at write time so the audit trail stays attributable after the '
  'staff account is deleted (actor_id becomes null).';

-- ─── content authorship ────────────────────────────────────────────────────
alter table public.models
  drop constraint if exists models_created_by_fkey,
  add constraint models_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.models
  drop constraint if exists models_updated_by_fkey,
  add constraint models_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.pages
  drop constraint if exists pages_updated_by_fkey,
  add constraint pages_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.site_settings
  drop constraint if exists site_settings_updated_by_fkey,
  add constraint site_settings_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null;

-- ─── who created whom ──────────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_created_by_fkey,
  add constraint profiles_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

-- ─── invitations die with their author (created_by is NOT NULL) ────────────
alter table public.admin_invites
  drop constraint if exists admin_invites_created_by_fkey,
  add constraint admin_invites_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete cascade;
