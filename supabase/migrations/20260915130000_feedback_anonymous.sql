-- A review can be anonymous. The flag is what the site renders on; the
-- CMS action blanks `author` when it is set, so no real name is stored for
-- an anonymous review — the table is publicly readable, and a name that is
-- not in it cannot leak through the API.

alter table public.testimonials
  add column if not exists is_anonymous boolean not null default false;
