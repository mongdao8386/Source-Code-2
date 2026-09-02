import { z } from 'zod';

/**
 * Central, validated environment access.
 *
 * `clientEnv` holds only NEXT_PUBLIC_* values and is safe to import anywhere.
 * `serverEnv()` is a lazy getter for secrets — calling it from a Client
 * Component throws, which keeps the service-role key off the browser bundle.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['vi', 'en']).default('vi'),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_DB_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_LOGIN: z
    .string()
    .regex(/^\d+\/\d+$/)
    .default('5/600'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  OWNER_INITIAL_PASSWORD: z.string().optional(),
  OWNER_FULL_NAME: z.string().optional(),
  // Optional. Without it the CMS simply hides the "Dịch" buttons and the
  // bilingual fields stay hand-typed, exactly as before.
  DEEPL_API_KEY: z.string().optional(),
  // DeepL runs free and paid keys on different hosts. Free keys end in ':fx',
  // which is what the route infers from — set this only to override that.
  DEEPL_API_URL: z.string().url().optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must not be called on the client');
  }
  if (!cached) {
    cached = serverSchema.parse(process.env);
  }
  return cached;
}

export function loginRateLimit(): { attempts: number; windowSeconds: number } {
  const [a, w] = serverEnv().RATE_LIMIT_LOGIN.split('/');
  return { attempts: Number(a), windowSeconds: Number(w) };
}
