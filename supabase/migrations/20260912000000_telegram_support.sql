-- A second Telegram channel.
--
-- Support on this site is Telegram and nothing else: one channel takes the
-- bookings, a second one is there when the first is busy, blocked or asleep.
-- Both are shown wherever the site invites contact; the booking button itself
-- opens the first and falls back to the second when the first is blank.
--
-- `create or replace view` may only append columns, never reorder them, so
-- the new one goes last.

alter table public.site_settings
  add column if not exists telegram_support_url text not null default ''::text;

create or replace view public.public_site_settings as
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
    telegram_support_url
  from public.site_settings
  where id;
