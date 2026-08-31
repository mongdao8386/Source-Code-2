/**
 * Where the CMS is reachable from the outside.
 *
 * The routes themselves live under src/app/console/, which is never served
 * directly — middleware rewrites ADMIN_PATH onto it and 404s any direct hit on
 * /console. That indirection is what lets the public path be configuration
 * rather than a directory name, so it can be changed (or rotated after a leak)
 * by editing .env alone.
 *
 * Treat the path as obscurity, not security: the real protection is the 404
 * cloak for non-staff plus mandatory TOTP. A guessed path still gets nothing.
 */
const RAW = process.env.NEXT_PUBLIC_ADMIN_PATH ?? '/admin-cms';

/** Normalised to a leading slash with no trailing slash, e.g. "/quan-tri-x7k2". */
export const ADMIN_PATH: string = (() => {
  const trimmed = RAW.trim().replace(/\/+$/, '');
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Must look like a plain URL path segment. This is not pedantry: Git Bash on
  // Windows rewrites env values that look like Unix paths, so a `.env` holding
  // "/admin-cms" can arrive as "C:/Program Files/Git/admin-cms". Without this
  // check that silently becomes the CMS route and nothing works, with no clue
  // as to why. Fail the build instead.
  if (!/^\/[a-z0-9](?:[a-z0-9._~-]|\/[a-z0-9])*$/i.test(withSlash)) {
    throw new Error(
      `NEXT_PUBLIC_ADMIN_PATH must be a simple path like "/admin-cms" — got "${RAW}". ` +
        `On Windows/Git Bash, export MSYS_NO_PATHCONV=1 to stop the shell rewriting it.`,
    );
  }

  // A path that collided with a real route would shadow the public site.
  if (/^\/(vi|en|api|_next|console)(\/|$)/.test(withSlash)) {
    throw new Error(
      `NEXT_PUBLIC_ADMIN_PATH "${RAW}" collides with a reserved route; pick another value.`,
    );
  }
  return withSlash;
})();

/** The internal route tree the CMS actually lives in. */
export const ADMIN_INTERNAL = '/console';

/**
 * The CMS interface language. Fixed: the console lives outside app/[locale] so
 * there is no locale segment to read, and only staff ever see it.
 */
export const CMS_LOCALE = 'vi' as const;

/** Build a link into the CMS: adminHref('/models') -> "/<admin-path>/models". */
export function adminHref(subPath = ''): string {
  const s = subPath && !subPath.startsWith('/') ? `/${subPath}` : subPath;
  return `${ADMIN_PATH}${s}`;
}
