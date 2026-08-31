-- ============================================================================
-- 0002_public_settings_view.sql
--
-- Fix: `public_site_settings` was created with `security_invoker = true`, so it
-- evaluated site_settings' RLS as the *calling* role. The only SELECT policy on
-- site_settings is staff-only, so anonymous visitors got zero rows — the public
-- site never received the Telegram URL, hero copy, or announcement, and the
-- "Đặt lịch" button was permanently disabled.
--
-- The view exists precisely to publish a safe column subset (it excludes
-- contact_email and phone), so it should run as its owner and bypass the
-- underlying row policy. Recreate it as a security-definer view and grant read
-- access explicitly. site_settings itself stays staff-only.
-- ============================================================================

drop view if exists public.public_site_settings;

create view public.public_site_settings
with (security_invoker = false)
as
  select telegram_channel_url, socials, hero, announcement, maintenance_mode
  from public.site_settings
  where id;

comment on view public.public_site_settings is
  'Safe public projection of site_settings. Runs as owner by design: it exposes '
  'only non-sensitive columns and must be readable by anonymous visitors. '
  'Never add contact_email, phone, or any new sensitive column here.';

revoke all on public.public_site_settings from public;
grant select on public.public_site_settings to anon, authenticated;
