-- Support is two people, not a second channel.
--
-- The booking button opens the Telegram channel (a private invite link, so
-- there is nothing readable to show for it). Support beside it is two staff
-- accounts a visitor can message directly: a display name and a username
-- each, rendered as "@username", never as a URL.
--
-- Replaces telegram_support_url from the previous migration. The view has to
-- be dropped and recreated because `create or replace view` cannot remove a
-- column; grants are restated so the anon read keeps working.

alter table public.site_settings
  add column if not exists telegram_support jsonb not null default '[]'::jsonb;

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
    telegram_support
  from public.site_settings
  where id;

grant select on public.public_site_settings to anon, authenticated, service_role;

alter table public.site_settings
  drop column if exists telegram_support_url;
