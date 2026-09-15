-- The date shown on a review is the operator's to set, or to leave out.
-- created_at stays the posting time and the fallback sort key; reviewed_at
-- is what the site prints, and null prints nothing.

alter table public.testimonials
  add column if not exists reviewed_at date;
