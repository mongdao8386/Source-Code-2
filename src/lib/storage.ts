import { clientEnv } from '@/lib/env';

/** Public URL for an object in the public models bucket. */
export function publicPhotoUrl(storagePath: string): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http')) return storagePath;
  return `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/models-public/${storagePath}`;
}
