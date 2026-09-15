-- Photo protection settings: the watermark laid over every photo on the
-- public site, and the browser-side deterrents (context menu, shortcuts,
-- blur when the window loses focus). One jsonb bag; lib/protection.ts owns
-- the shape and the defaults, so an empty object means "defaults".
--
-- The view is dropped and recreated because `create or replace view` cannot
-- append a column ahead of others reliably across versions; grants restated.

alter table public.site_settings
  add column if not exists protection jsonb not null default '{}'::jsonb;

drop view if exists public.public_site_settings;

create view public.public_site_settings as
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
    accent_color,
    telegram_support,
    protection
  from public.site_settings
  where id;

grant select on public.public_site_settings to anon, authenticated, service_role;
