/**
 * Copies the ffmpeg.wasm core into public/ so the CMS can load it same-origin.
 *
 * The wasm blob is ~32 MB. It is deliberately not committed — it would bloat
 * every clone — so this runs before the build and the output is gitignored.
 * Loading it from a CDN instead was rejected: the CSP allows no external script
 * origins, and the editor should not depend on a third party's uptime.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const src = 'node_modules/@ffmpeg/core/dist/umd';
const dest = 'public/ffmpeg';
const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

if (!existsSync(src)) {
  console.warn(`[ffmpeg] ${src} missing — run npm install. Skipping.`);
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) {
  const from = join(src, f);
  if (!existsSync(from)) {
    console.warn(`[ffmpeg] ${from} missing. Skipping.`);
    continue;
  }
  copyFileSync(from, join(dest, f));
}
console.log(`[ffmpeg] core copied into ${dest}`);
