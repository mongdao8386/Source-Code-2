create type "public"."content_status" as enum ('draft', 'published');

create type "public"."staff_role" as enum ('owner', 'admin');

create table "public"."admin_invites" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "token_hash" text not null,
    "role" staff_role not null default 'admin'::staff_role,
    "expires_at" timestamp with time zone not null,
    "accepted_at" timestamp with time zone,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."admin_invites" enable row level security;

create table "public"."audit_logs" (
    "id" bigint generated always as identity not null,
    "actor_id" uuid,
    "actor_email" text,
    "action" text not null,
    "entity" text not null,
    "entity_id" text,
    "meta" jsonb not null default '{}'::jsonb,
    "ip" inet,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."audit_logs" enable row level security;

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "name" jsonb not null default '{}'::jsonb,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."categories" enable row level security;

create table "public"."click_events" (
    "id" bigint generated always as identity not null,
    "kind" text not null default 'booking'::text,
    "model_id" uuid,
    "locale" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."click_events" enable row level security;

create table "public"."model_photos" (
    "id" uuid not null default gen_random_uuid(),
    "model_id" uuid not null,
    "storage_path" text not null,
    "width" integer,
    "height" integer,
    "alt" jsonb not null default '{}'::jsonb,
    "sort_order" integer not null default 0,
    "is_cover" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."model_photos" enable row level security;

create table "public"."models" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "stage_name" text not null,
    "status" content_status not null default 'draft'::content_status,
    "cover_photo_id" uuid,
    "height_cm" integer,
    "measurements" jsonb not null default '{}'::jsonb,
    "city" text,
    "experience_years" integer,
    "bio" jsonb not null default '{}'::jsonb,
    "category_ids" uuid[] not null default '{}'::uuid[],
    "display_order" integer not null default 0,
    "seo" jsonb not null default '{}'::jsonb,
    "created_by" uuid,
    "updated_by" uuid,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "video_path" text not null default ''::text,
    "video_poster_path" text not null default ''::text,
    "video_duration" numeric,
    "details" jsonb not null default '[]'::jsonb
);


alter table "public"."models" enable row level security;

create table "public"."pages" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "title" jsonb not null default '{}'::jsonb,
    "body" jsonb not null default '{}'::jsonb,
    "status" content_status not null default 'draft'::content_status,
    "seo" jsonb not null default '{}'::jsonb,
    "updated_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."pages" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "role" staff_role not null default 'admin'::staff_role,
    "full_name" text not null default ''::text,
    "is_active" boolean not null default true,
    "created_by" uuid,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."site_settings" (
    "id" boolean not null default true,
    "telegram_channel_url" text not null default ''::text,
    "contact_email" text not null default ''::text,
    "phone" text not null default ''::text,
    "socials" jsonb not null default '{}'::jsonb,
    "hero" jsonb not null default '{}'::jsonb,
    "announcement" jsonb not null default '{}'::jsonb,
    "maintenance_mode" boolean not null default false,
    "brand_name" text not null default 'BƯỚM XOÈ'::text,
    "logo_path" text not null default ''::text,
    "favicon_path" text not null default ''::text,
    "og_image_path" text not null default ''::text,
    "accent_color" text not null default '#c8a253'::text,
    "updated_by" uuid,
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."site_settings" enable row level security;

create table "public"."testimonials" (
    "id" uuid not null default gen_random_uuid(),
    "author" text not null,
    "role" text,
    "quote" jsonb not null default '{}'::jsonb,
    "avatar_path" text,
    "rating" integer,
    "is_published" boolean not null default false,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."testimonials" enable row level security;

CREATE INDEX admin_invites_email_idx ON public.admin_invites USING btree (lower(email));

CREATE UNIQUE INDEX admin_invites_pkey ON public.admin_invites USING btree (id);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE INDEX click_events_created_at_idx ON public.click_events USING btree (created_at DESC);

CREATE UNIQUE INDEX click_events_pkey ON public.click_events USING btree (id);

CREATE INDEX model_photos_model_id_idx ON public.model_photos USING btree (model_id, sort_order);

CREATE UNIQUE INDEX model_photos_pkey ON public.model_photos USING btree (id);

CREATE INDEX models_category_ids_idx ON public.models USING gin (category_ids);

CREATE INDEX models_display_order_idx ON public.models USING btree (display_order);

CREATE UNIQUE INDEX models_pkey ON public.models USING btree (id);

CREATE UNIQUE INDEX models_slug_key ON public.models USING btree (slug);

CREATE INDEX models_status_idx ON public.models USING btree (status);

CREATE UNIQUE INDEX pages_pkey ON public.pages USING btree (id);

CREATE UNIQUE INDEX pages_slug_key ON public.pages USING btree (slug);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX site_settings_pkey ON public.site_settings USING btree (id);

CREATE UNIQUE INDEX testimonials_pkey ON public.testimonials USING btree (id);

alter table "public"."admin_invites" add constraint "admin_invites_pkey" PRIMARY KEY using index "admin_invites_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."click_events" add constraint "click_events_pkey" PRIMARY KEY using index "click_events_pkey";

alter table "public"."model_photos" add constraint "model_photos_pkey" PRIMARY KEY using index "model_photos_pkey";

alter table "public"."models" add constraint "models_pkey" PRIMARY KEY using index "models_pkey";

alter table "public"."pages" add constraint "pages_pkey" PRIMARY KEY using index "pages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."site_settings" add constraint "site_settings_pkey" PRIMARY KEY using index "site_settings_pkey";

alter table "public"."testimonials" add constraint "testimonials_pkey" PRIMARY KEY using index "testimonials_pkey";

alter table "public"."admin_invites" add constraint "admin_invites_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."admin_invites" validate constraint "admin_invites_created_by_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_actor_id_fkey";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."click_events" add constraint "click_events_model_id_fkey" FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL not valid;

alter table "public"."click_events" validate constraint "click_events_model_id_fkey";

alter table "public"."model_photos" add constraint "model_photos_model_id_fkey" FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE not valid;

alter table "public"."model_photos" validate constraint "model_photos_model_id_fkey";

alter table "public"."models" add constraint "models_cover_photo_fk" FOREIGN KEY (cover_photo_id) REFERENCES model_photos(id) ON DELETE SET NULL not valid;

alter table "public"."models" validate constraint "models_cover_photo_fk";

alter table "public"."models" add constraint "models_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."models" validate constraint "models_created_by_fkey";

alter table "public"."models" add constraint "models_details_shape" CHECK (((jsonb_typeof(details) = 'array'::text) AND (jsonb_array_length(details) <= 30))) not valid;

alter table "public"."models" validate constraint "models_details_shape";

alter table "public"."models" add constraint "models_experience_years_check" CHECK (((experience_years IS NULL) OR ((experience_years >= 0) AND (experience_years <= 60)))) not valid;

alter table "public"."models" validate constraint "models_experience_years_check";

alter table "public"."models" add constraint "models_height_cm_check" CHECK (((height_cm IS NULL) OR ((height_cm >= 120) AND (height_cm <= 230)))) not valid;

alter table "public"."models" validate constraint "models_height_cm_check";

alter table "public"."models" add constraint "models_slug_key" UNIQUE using index "models_slug_key";

alter table "public"."models" add constraint "models_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."models" validate constraint "models_updated_by_fkey";

alter table "public"."pages" add constraint "pages_slug_key" UNIQUE using index "pages_slug_key";

alter table "public"."pages" add constraint "pages_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."pages" validate constraint "pages_updated_by_fkey";

alter table "public"."profiles" add constraint "profiles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_created_by_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."site_settings" add constraint "site_settings_accent_hex" CHECK ((accent_color ~ '^#[0-9a-fA-F]{6}$'::text)) not valid;

alter table "public"."site_settings" validate constraint "site_settings_accent_hex";

alter table "public"."site_settings" add constraint "site_settings_singleton" CHECK (id) not valid;

alter table "public"."site_settings" validate constraint "site_settings_singleton";

alter table "public"."site_settings" add constraint "site_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."site_settings" validate constraint "site_settings_updated_by_fkey";

alter table "public"."testimonials" add constraint "testimonials_rating_check" CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))) not valid;

alter table "public"."testimonials" validate constraint "testimonials_rating_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.guard_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner' and auth.uid() is not null and not public.is_owner() then
      raise exception 'only the owner may grant the owner role';
    end if;
    return new;
  end if;

  if auth.uid() is not null then
    if new.id = auth.uid() and (new.role <> old.role or new.is_active <> old.is_active) then
      raise exception 'cannot change your own role or active flag';
    end if;
    if new.role <> old.role and not public.is_owner() then
      raise exception 'only the owner may change roles';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      raise exception 'the owner role cannot be demoted';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = 'owner'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active);
$function$
;

create or replace view "public"."public_site_settings" as  SELECT telegram_channel_url,
    socials,
    hero,
    announcement,
    maintenance_mode,
    brand_name,
    logo_path,
    favicon_path,
    og_image_path,
    accent_color
   FROM site_settings
  WHERE id;


CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."admin_invites" to "anon";

grant insert on table "public"."admin_invites" to "anon";

grant references on table "public"."admin_invites" to "anon";

grant select on table "public"."admin_invites" to "anon";

grant trigger on table "public"."admin_invites" to "anon";

grant truncate on table "public"."admin_invites" to "anon";

grant update on table "public"."admin_invites" to "anon";

grant delete on table "public"."admin_invites" to "authenticated";

grant insert on table "public"."admin_invites" to "authenticated";

grant references on table "public"."admin_invites" to "authenticated";

grant select on table "public"."admin_invites" to "authenticated";

grant trigger on table "public"."admin_invites" to "authenticated";

grant truncate on table "public"."admin_invites" to "authenticated";

grant update on table "public"."admin_invites" to "authenticated";

grant delete on table "public"."admin_invites" to "service_role";

grant insert on table "public"."admin_invites" to "service_role";

grant references on table "public"."admin_invites" to "service_role";

grant select on table "public"."admin_invites" to "service_role";

grant trigger on table "public"."admin_invites" to "service_role";

grant truncate on table "public"."admin_invites" to "service_role";

grant update on table "public"."admin_invites" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."click_events" to "anon";

grant insert on table "public"."click_events" to "anon";

grant references on table "public"."click_events" to "anon";

grant select on table "public"."click_events" to "anon";

grant trigger on table "public"."click_events" to "anon";

grant truncate on table "public"."click_events" to "anon";

grant update on table "public"."click_events" to "anon";

grant delete on table "public"."click_events" to "authenticated";

grant insert on table "public"."click_events" to "authenticated";

grant references on table "public"."click_events" to "authenticated";

grant select on table "public"."click_events" to "authenticated";

grant trigger on table "public"."click_events" to "authenticated";

grant truncate on table "public"."click_events" to "authenticated";

grant update on table "public"."click_events" to "authenticated";

grant delete on table "public"."click_events" to "service_role";

grant insert on table "public"."click_events" to "service_role";

grant references on table "public"."click_events" to "service_role";

grant select on table "public"."click_events" to "service_role";

grant trigger on table "public"."click_events" to "service_role";

grant truncate on table "public"."click_events" to "service_role";

grant update on table "public"."click_events" to "service_role";

grant delete on table "public"."model_photos" to "anon";

grant insert on table "public"."model_photos" to "anon";

grant references on table "public"."model_photos" to "anon";

grant select on table "public"."model_photos" to "anon";

grant trigger on table "public"."model_photos" to "anon";

grant truncate on table "public"."model_photos" to "anon";

grant update on table "public"."model_photos" to "anon";

grant delete on table "public"."model_photos" to "authenticated";

grant insert on table "public"."model_photos" to "authenticated";

grant references on table "public"."model_photos" to "authenticated";

grant select on table "public"."model_photos" to "authenticated";

grant trigger on table "public"."model_photos" to "authenticated";

grant truncate on table "public"."model_photos" to "authenticated";

grant update on table "public"."model_photos" to "authenticated";

grant delete on table "public"."model_photos" to "service_role";

grant insert on table "public"."model_photos" to "service_role";

grant references on table "public"."model_photos" to "service_role";

grant select on table "public"."model_photos" to "service_role";

grant trigger on table "public"."model_photos" to "service_role";

grant truncate on table "public"."model_photos" to "service_role";

grant update on table "public"."model_photos" to "service_role";

grant delete on table "public"."models" to "anon";

grant insert on table "public"."models" to "anon";

grant references on table "public"."models" to "anon";

grant select on table "public"."models" to "anon";

grant trigger on table "public"."models" to "anon";

grant truncate on table "public"."models" to "anon";

grant update on table "public"."models" to "anon";

grant delete on table "public"."models" to "authenticated";

grant insert on table "public"."models" to "authenticated";

grant references on table "public"."models" to "authenticated";

grant select on table "public"."models" to "authenticated";

grant trigger on table "public"."models" to "authenticated";

grant truncate on table "public"."models" to "authenticated";

grant update on table "public"."models" to "authenticated";

grant delete on table "public"."models" to "service_role";

grant insert on table "public"."models" to "service_role";

grant references on table "public"."models" to "service_role";

grant select on table "public"."models" to "service_role";

grant trigger on table "public"."models" to "service_role";

grant truncate on table "public"."models" to "service_role";

grant update on table "public"."models" to "service_role";

grant delete on table "public"."pages" to "anon";

grant insert on table "public"."pages" to "anon";

grant references on table "public"."pages" to "anon";

grant select on table "public"."pages" to "anon";

grant trigger on table "public"."pages" to "anon";

grant truncate on table "public"."pages" to "anon";

grant update on table "public"."pages" to "anon";

grant delete on table "public"."pages" to "authenticated";

grant insert on table "public"."pages" to "authenticated";

grant references on table "public"."pages" to "authenticated";

grant select on table "public"."pages" to "authenticated";

grant trigger on table "public"."pages" to "authenticated";

grant truncate on table "public"."pages" to "authenticated";

grant update on table "public"."pages" to "authenticated";

grant delete on table "public"."pages" to "service_role";

grant insert on table "public"."pages" to "service_role";

grant references on table "public"."pages" to "service_role";

grant select on table "public"."pages" to "service_role";

grant trigger on table "public"."pages" to "service_role";

grant truncate on table "public"."pages" to "service_role";

grant update on table "public"."pages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."site_settings" to "anon";

grant insert on table "public"."site_settings" to "anon";

grant references on table "public"."site_settings" to "anon";

grant trigger on table "public"."site_settings" to "anon";

grant truncate on table "public"."site_settings" to "anon";

grant update on table "public"."site_settings" to "anon";

grant delete on table "public"."site_settings" to "authenticated";

grant insert on table "public"."site_settings" to "authenticated";

grant references on table "public"."site_settings" to "authenticated";

grant select on table "public"."site_settings" to "authenticated";

grant trigger on table "public"."site_settings" to "authenticated";

grant truncate on table "public"."site_settings" to "authenticated";

grant update on table "public"."site_settings" to "authenticated";

grant delete on table "public"."site_settings" to "service_role";

grant insert on table "public"."site_settings" to "service_role";

grant references on table "public"."site_settings" to "service_role";

grant select on table "public"."site_settings" to "service_role";

grant trigger on table "public"."site_settings" to "service_role";

grant truncate on table "public"."site_settings" to "service_role";

grant update on table "public"."site_settings" to "service_role";

grant delete on table "public"."testimonials" to "anon";

grant insert on table "public"."testimonials" to "anon";

grant references on table "public"."testimonials" to "anon";

grant select on table "public"."testimonials" to "anon";

grant trigger on table "public"."testimonials" to "anon";

grant truncate on table "public"."testimonials" to "anon";

grant update on table "public"."testimonials" to "anon";

grant delete on table "public"."testimonials" to "authenticated";

grant insert on table "public"."testimonials" to "authenticated";

grant references on table "public"."testimonials" to "authenticated";

grant select on table "public"."testimonials" to "authenticated";

grant trigger on table "public"."testimonials" to "authenticated";

grant truncate on table "public"."testimonials" to "authenticated";

grant update on table "public"."testimonials" to "authenticated";

grant delete on table "public"."testimonials" to "service_role";

grant insert on table "public"."testimonials" to "service_role";

grant references on table "public"."testimonials" to "service_role";

grant select on table "public"."testimonials" to "service_role";

grant trigger on table "public"."testimonials" to "service_role";

grant truncate on table "public"."testimonials" to "service_role";

grant update on table "public"."testimonials" to "service_role";

create policy "admin_invites_owner"
on "public"."admin_invites"
as permissive
for all
to public
using (is_owner())
with check (is_owner());


create policy "audit_logs_staff_read"
on "public"."audit_logs"
as permissive
for select
to public
using (is_staff());


create policy "categories_read"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "categories_write"
on "public"."categories"
as permissive
for all
to public
using (is_staff())
with check (is_staff());


create policy "click_events_insert"
on "public"."click_events"
as permissive
for insert
to public
with check (true);


create policy "click_events_staff_read"
on "public"."click_events"
as permissive
for select
to public
using (is_staff());


create policy "model_photos_public_read"
on "public"."model_photos"
as permissive
for select
to public
using ((is_staff() OR (EXISTS ( SELECT 1
   FROM models m
  WHERE ((m.id = model_photos.model_id) AND (m.status = 'published'::content_status))))));


create policy "model_photos_staff_write"
on "public"."model_photos"
as permissive
for all
to public
using (is_staff())
with check (is_staff());


create policy "models_public_read"
on "public"."models"
as permissive
for select
to public
using (((status = 'published'::content_status) OR is_staff()));


create policy "models_staff_write"
on "public"."models"
as permissive
for all
to public
using (is_staff())
with check (is_staff());


create policy "pages_public_read"
on "public"."pages"
as permissive
for select
to public
using (((status = 'published'::content_status) OR is_staff()));


create policy "pages_staff_write"
on "public"."pages"
as permissive
for all
to public
using (is_staff())
with check (is_staff());


create policy "profiles_owner_write"
on "public"."profiles"
as permissive
for all
to public
using (is_owner())
with check (is_owner());


create policy "profiles_self_read"
on "public"."profiles"
as permissive
for select
to public
using (((id = auth.uid()) OR is_owner()));


create policy "site_settings_public_read"
on "public"."site_settings"
as permissive
for select
to anon
using (true);


create policy "site_settings_staff_read"
on "public"."site_settings"
as permissive
for select
to authenticated
using (is_staff());


create policy "site_settings_staff_write"
on "public"."site_settings"
as permissive
for all
to authenticated
using (is_staff())
with check (is_staff());


create policy "testimonials_public_read"
on "public"."testimonials"
as permissive
for select
to public
using ((is_published OR is_staff()));


create policy "testimonials_staff_write"
on "public"."testimonials"
as permissive
for all
to public
using (is_staff())
with check (is_staff());


CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER models_touch BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER pages_touch BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER profiles_guard_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_role();

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER testimonials_touch BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION touch_updated_at();



-- ============================================================================
-- Carried over by hand from 20260901000000_schema.sql.
--
-- `supabase db pull` dumps the public schema only. It returns no rows and
-- nothing from the storage schema, so the buckets, the policies that guard
-- them, and the starter content the public pages render did not survive the
-- regeneration — the site would build and then come up empty, with uploads
-- failing against a bucket that does not exist.
--
-- Every statement below is idempotent, so re-running this file is safe.
-- ============================================================================
-- ============================================================================
-- Storage
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('models-public', 'models-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('models-private', 'models-private', false)
on conflict (id) do nothing;

drop policy if exists "public bucket read" on storage.objects;
create policy "public bucket read"
  on storage.objects for select
  using (bucket_id = 'models-public');

drop policy if exists "staff upload public bucket" on storage.objects;
create policy "staff upload public bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff modify public bucket" on storage.objects;
create policy "staff modify public bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff delete public bucket" on storage.objects;
create policy "staff delete public bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'models-public' and public.is_staff());

drop policy if exists "staff all private bucket" on storage.objects;
create policy "staff all private bucket"
  on storage.objects for all to authenticated
  using (bucket_id = 'models-private' and public.is_staff())
  with check (bucket_id = 'models-private' and public.is_staff());

-- ============================================================================
-- Starter data
--
-- The owner account is deliberately not here: it needs an auth.users row, which
-- only the service role can create. Run `npm run seed:owner` for that.
-- ============================================================================

insert into public.site_settings (id, hero, announcement)
values (
  true,
  jsonb_build_object(
    'headline', jsonb_build_object('vi', 'Gái xinh chờ bạn', 'en', 'Beautiful girls waiting'),
    'sub', jsonb_build_object(
      'vi', 'Tuyển chọn gái xinh cho từng nhu cầu.',
      'en', 'A curated selection of beautiful girls for your needs.'
    ),
    'image', ''
  ),
  jsonb_build_object('enabled', false, 'text', jsonb_build_object('vi', '', 'en', ''))
)
on conflict (id) do nothing;

insert into public.categories (slug, name, sort_order) values
  ('tre-trung', jsonb_build_object('vi', 'Trẻ trung', 'en', 'Young'), 1),
  ('trung-nien', jsonb_build_object('vi', 'Trung niên', 'en', 'Mature'), 2),
  ('sinh-vien', jsonb_build_object('vi', 'Sinh viên', 'en', 'Student'), 3),
  ('van-phong', jsonb_build_object('vi', 'Văn phòng', 'en', 'Office'), 4),
  ('ky-nang', jsonb_build_object('vi', 'Kỹ năng', 'en', 'Skilled'), 5)
on conflict (slug) do nothing;

insert into public.pages (slug, title, body, status) values
  ('about',
   jsonb_build_object('vi', 'Về chúng tôi', 'en', 'About us'),
   jsonb_build_object('vi', E'## Về chúng tôi\n\nNội dung đang được cập nhật.', 'en', E'## About us\n\nContent coming soon.'),
   'published'),
  ('terms',
   jsonb_build_object('vi', 'Điều khoản', 'en', 'Terms'),
   jsonb_build_object('vi', E'## Điều khoản sử dụng\n\nNội dung đang được cập nhật.', 'en', E'## Terms of use\n\nContent coming soon.'),
   'published'),
  ('guide',
   jsonb_build_object('vi', 'Hướng dẫn', 'en', 'Guide'),
   jsonb_build_object('vi', E'## Hướng dẫn đặt lịch\n\n1. Chọn gái.\n2. Nhấn **Đặt lịch**.\n3. Trao đổi chi tiết qua Telegram.', 'en', E'## How to book\n\n1. Pick a girl.\n2. Tap **Book**.\n3. Sort out the details on Telegram.'),
   'published')
on conflict (slug) do nothing;
