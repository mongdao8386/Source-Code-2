-- ============================================================================
-- 20260901000005_branding.sql
--
-- Makes the brand editable from the CMS. The wordmark "STUDIO." was hardcoded
-- in six components, so renaming the site meant editing code and rebuilding.
--
-- Column grants matter here: migration 0004 revoked blanket SELECT from anon
-- and re-granted it column by column, so any new column the public site needs
-- has to be added to that grant explicitly or it silently reads as missing.
-- ============================================================================

alter table public.site_settings
  add column if not exists brand_name    text not null default 'STUDIO',
  add column if not exists logo_path     text not null default '',
  add column if not exists favicon_path  text not null default '',
  add column if not exists og_image_path text not null default '',
  add column if not exists accent_color  text not null default '#c8a253';

-- Guard the colour at the database level too: it ends up inside a CSS custom
-- property, so anything that is not a plain hex literal is refused here rather
-- than relying on the form alone.
alter table public.site_settings
  drop constraint if exists site_settings_accent_hex;
alter table public.site_settings
  add constraint site_settings_accent_hex
  check (accent_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.site_settings.logo_path is
  'Storage path in models-public (brand/ prefix). Empty means render brand_name as text.';

-- Extend the anon column grant from 0004 with the new public columns.
grant select (
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

-- Rebuild the public projection to expose them.
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
