-- ============================================================================
-- 20260831000004_settings_column_grants.sql
--
-- Removes the SECURITY DEFINER view flagged by the Supabase linter.
--
-- Background: site_settings holds contact_email and phone, so its only SELECT
-- policy was staff-only. The public site still needs the Telegram URL, hero
-- copy and announcement. Migration 0002 solved that by making
-- public_site_settings a definer view, which bypasses RLS entirely — it works,
-- but it is a blunt tool: the view becomes the only thing standing between the
-- public and the whole table, so adding one sensitive column to it silently
-- publishes that column.
--
-- Postgres fits this better. RLS answers "which rows"; column privileges answer
-- "which columns". Note that staff and visitors are not separated by column
-- grants — CMS staff are the `authenticated` role and legitimately read the
-- whole row — so the split is:
--
--   anon           row policy: all rows | columns: the five public ones
--   authenticated  row policy: staff only (is_staff) | columns: all
--
-- A non-staff authenticated user therefore matches no policy and sees nothing,
-- and anon cannot read contact_email or phone even if this view is later
-- edited by mistake. The view no longer needs elevated rights.
-- ============================================================================

-- 1. Anonymous visitors may read the settings row; columns are capped below.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select
  to anon
  using (true);

-- site_settings_staff_read (from 0001) still gates `authenticated` on is_staff().

-- 2. Column privileges — the actual guard, enforced by Postgres regardless of
--    policy text or view definition.
revoke select on public.site_settings from anon;
grant select (
  telegram_channel_url,
  socials,
  hero,
  announcement,
  maintenance_mode
) on public.site_settings to anon;

-- Staff need the full row (the CMS settings form edits contact_email/phone);
-- the staff policy is what restricts this, not the grant.
grant select on public.site_settings to authenticated;

-- 3. With the above in place the view can run as its caller.
drop view if exists public.public_site_settings;

create view public.public_site_settings
with (security_invoker = true)
as
  select telegram_channel_url, socials, hero, announcement, maintenance_mode
  from public.site_settings
  where id;

comment on view public.public_site_settings is
  'Safe public projection of site_settings. Invoker rights: anon holds column '
  'privileges on these five columns only, so contact_email and phone stay '
  'unreadable even if this definition is later changed by mistake.';

revoke all on public.public_site_settings from public;
grant select on public.public_site_settings to anon, authenticated;
