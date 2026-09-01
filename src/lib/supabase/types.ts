/**
 * Hand-authored to match supabase/migrations. Regenerate with:
 *   supabase gen types typescript --linked > src/lib/supabase/types.ts
 *
 * NOTE: entity shapes are `type` aliases (not interfaces) on purpose — the
 * supabase-js generics require `Row extends Record<string, unknown>`, which
 * interfaces do not satisfy (no implicit index signature).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = 'owner' | 'admin';
export type ContentStatus = 'draft' | 'published';

/** Bilingual string bag. */
export type I18nText = { vi?: string; en?: string };

type Timestamps = { created_at: string; updated_at: string };

export type Profile = {
  id: string;
  role: StaffRole;
  full_name: string;
  is_active: boolean;
  created_by: string | null;
  last_login_at: string | null;
} & Timestamps;

export type Category = {
  id: string;
  slug: string;
  name: I18nText;
  sort_order: number;
} & Timestamps;

export type Model = {
  id: string;
  slug: string;
  stage_name: string;
  status: ContentStatus;
  cover_photo_id: string | null;
  height_cm: number | null;
  measurements: Json;
  city: string | null;
  experience_years: number | null;
  bio: I18nText;
  category_ids: string[];
  display_order: number;
  seo: Json;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  video_path: string;
  video_poster_path: string;
  video_duration: number | null;
} & Timestamps;

export type ModelPhoto = {
  id: string;
  model_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  alt: I18nText;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};

export type Page = {
  id: string;
  slug: string;
  title: I18nText;
  body: I18nText;
  status: ContentStatus;
  seo: Json;
  updated_by: string | null;
} & Timestamps;

export type Testimonial = {
  id: string;
  author: string;
  role: string | null;
  quote: I18nText;
  avatar_path: string | null;
  rating: number | null;
  is_published: boolean;
  sort_order: number;
} & Timestamps;

export type SiteSettings = {
  id: boolean;
  telegram_channel_url: string;
  brand_name: string;
  logo_path: string;
  favicon_path: string;
  og_image_path: string;
  /** Hex literal, enforced by a CHECK constraint — it lands in a CSS variable. */
  accent_color: string;
  contact_email: string;
  phone: string;
  socials: Json;
  hero: Json;
  announcement: Json;
  maintenance_mode: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type PublicSiteSettings = Pick<
  SiteSettings,
  | 'telegram_channel_url'
  | 'socials'
  | 'hero'
  | 'announcement'
  | 'maintenance_mode'
  | 'brand_name'
  | 'logo_path'
  | 'favicon_path'
  | 'og_image_path'
  | 'accent_color'
>;

export type AdminInvite = {
  id: string;
  email: string;
  token_hash: string;
  role: StaffRole;
  expires_at: string;
  accepted_at: string | null;
  created_by: string;
  created_at: string;
};

export type AuditLog = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Json;
  ip: string | null;
  created_at: string;
};

export type ClickEvent = {
  id: number;
  kind: string;
  model_id: string | null;
  locale: string | null;
  created_at: string;
};

type TableShape<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<
        Profile,
        PartialBy<
          Profile,
          | 'created_at'
          | 'updated_at'
          | 'last_login_at'
          | 'created_by'
          | 'full_name'
          | 'is_active'
          | 'role'
        >,
        Partial<Profile>
      >;
      categories: TableShape<
        Category,
        PartialBy<Category, 'id' | 'created_at' | 'updated_at' | 'sort_order'>,
        Partial<Category>
      >;
      models: TableShape<
        Model,
        PartialBy<
          Model,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'published_at'
          | 'cover_photo_id'
          | 'measurements'
          | 'category_ids'
          | 'display_order'
          | 'seo'
          | 'bio'
          | 'created_by'
          | 'updated_by'
          | 'status'
          | 'height_cm'
          | 'city'
          | 'experience_years'
          | 'video_path'
          | 'video_poster_path'
          | 'video_duration'
        >,
        Partial<Model>
      >;
      model_photos: TableShape<
        ModelPhoto,
        PartialBy<
          ModelPhoto,
          'id' | 'created_at' | 'alt' | 'sort_order' | 'is_cover' | 'width' | 'height'
        >,
        Partial<ModelPhoto>
      >;
      pages: TableShape<
        Page,
        PartialBy<Page, 'id' | 'created_at' | 'updated_at' | 'seo' | 'updated_by' | 'status'>,
        Partial<Page>
      >;
      testimonials: TableShape<
        Testimonial,
        PartialBy<
          Testimonial,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'sort_order'
          | 'is_published'
          | 'rating'
          | 'role'
          | 'avatar_path'
        >,
        Partial<Testimonial>
      >;
      site_settings: TableShape<
        SiteSettings,
        PartialBy<SiteSettings, 'id' | 'updated_at' | 'updated_by'>,
        Partial<SiteSettings>
      >;
      admin_invites: TableShape<
        AdminInvite,
        PartialBy<AdminInvite, 'id' | 'created_at' | 'accepted_at' | 'role'>,
        Partial<AdminInvite>
      >;
      audit_logs: TableShape<
        AuditLog,
        PartialBy<
          AuditLog,
          'id' | 'created_at' | 'meta' | 'ip' | 'actor_id' | 'actor_email' | 'entity_id'
        >,
        Partial<AuditLog>
      >;
      click_events: TableShape<
        ClickEvent,
        PartialBy<ClickEvent, 'id' | 'created_at' | 'kind' | 'model_id' | 'locale'>,
        Partial<ClickEvent>
      >;
    };
    Views: {
      public_site_settings: {
        Row: PublicSiteSettings;
        Relationships: [];
      };
    };
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_owner: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      staff_role: StaffRole;
      content_status: ContentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
