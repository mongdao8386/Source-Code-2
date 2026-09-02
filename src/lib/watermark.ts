import 'server-only';

import sharp from 'sharp';

/**
 * Tiled watermark for uploaded photography.
 *
 * A corner mark is the tasteful option and it protects nothing — five seconds
 * of cropping removes it. The point of marking these images is that a copy
 * taken off the site stays traceable and stays awkward to reuse, so the text
 * repeats across the whole frame on a diagonal, at an opacity low enough to
 * read past but high enough to survive a screenshot.
 *
 * Nothing here stops a determined copy: anything a browser renders can be
 * captured. What it does is make the result obviously yours.
 */

/** 0 is invisible, 1 is opaque. Around 0.12 reads without ruining the photo. */
const OPACITY = 0.12;
/** Text height as a fraction of image width. */
const SIZE_RATIO = 0.028;
const MIN_FONT = 13;
const ANGLE = -30;

/** The brand name comes from the CMS, so it can contain anything. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Composites the tile over `input`. Returns the original buffer untouched if
 * anything goes wrong — a watermark is worth less than the upload it would
 * otherwise fail, and the caller has already validated and re-encoded.
 */
export async function watermarkImage(input: Buffer, rawText: string): Promise<Buffer> {
  const text = escapeXml(rawText.trim().slice(0, 40));
  if (!text) return input;

  try {
    const meta = await sharp(input).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 200 || height < 200) return input;

    const font = Math.max(MIN_FONT, Math.round(width * SIZE_RATIO));
    const stepX = Math.round(font * (text.length * 0.75 + 6));
    const stepY = Math.round(font * 5);

    // Rotation pulls the grid off the corners, so lay it out over a box big
    // enough that the image still sits fully inside once turned.
    const over = Math.round(Math.max(width, height) * 0.75);

    const rows: string[] = [];
    for (let y = -over; y < height + over; y += stepY) {
      // Offset every other row so the marks do not line up into columns, which
      // would leave clean vertical lanes straight through the picture.
      const shift = ((y / stepY) | 0) % 2 === 0 ? 0 : Math.round(stepX / 2);
      for (let x = -over + shift; x < width + over; x += stepX) {
        rows.push(`<text x="${x}" y="${y}">${text}</text>`);
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<g transform="rotate(${ANGLE} ${width / 2} ${height / 2})"
   font-family="DejaVu Sans, Helvetica, Arial, sans-serif"
   font-size="${font}" font-weight="700"
   fill="#ffffff" fill-opacity="${OPACITY}"
   stroke="#000000" stroke-opacity="${OPACITY / 3}" stroke-width="${Math.max(1, font / 14)}"
   letter-spacing="${(font * 0.08).toFixed(2)}">
${rows.join('\n')}
</g>
</svg>`;

    return await sharp(input)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return input;
  }
}
