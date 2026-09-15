-- Testimonials become feedback: a review can point at the model it is about
-- and carry media — chat screenshots, a clip — alongside the text.
--
-- media is a jsonb array of { kind: 'image' | 'video', path, width?, height? }
-- with paths under feedback/ in the public bucket; lib/feedback.ts owns the
-- shape and re-checks it on read, the same way model details are handled.

alter table public.testimonials
  add column if not exists model_id uuid references public.models(id) on delete set null,
  add column if not exists media jsonb not null default '[]'::jsonb;

create index if not exists testimonials_model_id_idx on public.testimonials (model_id);
create index if not exists testimonials_created_at_idx on public.testimonials (created_at desc);
