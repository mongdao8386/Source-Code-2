/**
 * Photo protection, read the same way on the site and in the CMS.
 *
 * Nothing a browser renders can be kept from a determined visitor: a screen
 * can always be photographed. What can be done is (a) make the casual routes
 * — right-click, drag, Ctrl+S, F12 — go nowhere, and (b) make sure whatever
 * does get captured carries the site's mark. The mark is an overlay drawn
 * over every photo at render time rather than baked into the file, so it
 * can be changed in settings and every photo, old and new, changes with it.
 *
 * Client-safe: the CMS builds the same SVG for its live preview.
 */

export type WatermarkMode = 'single' | 'tile' | 'corner';
export type WatermarkColor = 'light' | 'dark' | 'gold';

export type Protection = {
  watermark: {
    enabled: boolean;
    /** Empty means "use the brand name". */
    text: string;
    /** 0.05–0.6 */
    opacity: number;
    /** Font size in px, 12–48. */
    size: number;
    /** Degrees, -60–60. Single and tile modes. */
    angle: number;
    mode: WatermarkMode;
    color: WatermarkColor;
  };
  /** Right-click on photos and video does nothing. */
  blockContextMenu: boolean;
  /** F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P do nothing. */
  blockShortcuts: boolean;
  /** Photos blur while the window is not focused — snipping tools steal focus. */
  hideOnBlur: boolean;
};

export const DEFAULT_PROTECTION: Protection = {
  watermark: {
    enabled: true,
    text: '',
    opacity: 0.18,
    size: 22,
    angle: -30,
    mode: 'single',
    color: 'light',
  },
  blockContextMenu: true,
  blockShortcuts: true,
  hideOnBlur: true,
};

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** jsonb in, a complete, clamped Protection out. Garbage falls back per field. */
export function readProtection(raw: unknown): Protection {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const w = (o.watermark && typeof o.watermark === 'object' ? o.watermark : {}) as Record<
    string,
    unknown
  >;
  const d = DEFAULT_PROTECTION;
  return {
    watermark: {
      enabled: bool(w.enabled, d.watermark.enabled),
      text: typeof w.text === 'string' ? w.text.trim().slice(0, 40) : '',
      opacity: clamp(w.opacity, 0.05, 0.6, d.watermark.opacity),
      size: Math.round(clamp(w.size, 12, 48, d.watermark.size)),
      angle: Math.round(clamp(w.angle, -60, 60, d.watermark.angle)),
      mode: w.mode === 'tile' || w.mode === 'corner' ? w.mode : 'single',
      color: w.color === 'dark' || w.color === 'gold' ? w.color : 'light',
    },
    blockContextMenu: bool(o.blockContextMenu, d.blockContextMenu),
    blockShortcuts: bool(o.blockShortcuts, d.blockShortcuts),
    hideOnBlur: bool(o.hideOnBlur, d.hideOnBlur),
  };
}

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/**
 * The CSS custom properties the overlay reads. `image` is an SVG data URL;
 * the text, colour and geometry all live inside it, so a change in settings
 * is a change of one string on <html>.
 */
export function watermarkCss(
  p: Protection,
  brandName: string,
  accent = '#c8a253',
): Record<'--wm-image' | '--wm-repeat' | '--wm-position' | '--wm-size', string> {
  const text = (p.watermark.text || brandName || '').trim();
  if (!p.watermark.enabled || !text) {
    return { '--wm-image': 'none', '--wm-repeat': 'no-repeat', '--wm-position': '0 0', '--wm-size': 'auto' };
  }

  const { size, opacity, angle, mode, color } = p.watermark;
  const fill = color === 'dark' ? '#000000' : color === 'gold' ? accent : '#ffffff';
  const fontAttrs = (letterSpacing: number) =>
    `font-family='Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-weight='600' letter-spacing='${letterSpacing}'`;
  const font = fontAttrs(2);
  const label = escapeXml(text.toUpperCase());
  // Rough glyph width for a bold sans at this size; generous so long names
  // never clip at the tile edge.
  const textW = Math.ceil(text.length * size * 0.72) + size;

  if (mode === 'single') {
    // One mark across the middle of the frame. The SVG has no pixel size,
    // only a 100×100 viewBox that the box stretches to 100% × 100%; with
    // "meet" the square scales to the frame's width and centres, so the
    // mark is always the same fraction of the photo whatever its size.
    // Units are therefore percent of the width: the size setting maps to
    // roughly 4–14% and a long name is shrunk so it still fits.
    const units = Math.min(size * 0.3, 90 / (Math.max(1, text.length) * 0.62));
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'>` +
      `<text x='50' y='50' text-anchor='middle' dominant-baseline='middle' font-size='${units.toFixed(2)}' ${fontAttrs(+(units * 0.12).toFixed(2))} fill='${fill}' fill-opacity='${opacity}' transform='rotate(${angle} 50 50)'>${label}</text>` +
      `</svg>`;
    return {
      '--wm-image': `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
      '--wm-repeat': 'no-repeat',
      '--wm-position': 'center',
      '--wm-size': '100% 100%',
    };
  }

  if (mode === 'corner') {
    const w = textW + size;
    const h = size * 2.2;
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
      `<text x='${w - size * 0.5}' y='${h - size * 0.7}' text-anchor='end' font-size='${size}' ${font} fill='${fill}' fill-opacity='${opacity}'>${label}</text>` +
      `</svg>`;
    return {
      '--wm-image': `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
      '--wm-repeat': 'no-repeat',
      '--wm-position': 'right bottom',
      '--wm-size': 'auto',
    };
  }

  // Tile: two marks per cell, the second offset by half a cell so the marks
  // do not line up into clean lanes that are easy to paint out. The cell is
  // sized from the rotated text's bounding box so a mark never crosses the
  // cell edge — a clipped mark does not continue in the next cell, it just
  // ends, and two ends side by side read as garbage.
  const rad = (Math.abs(angle) * Math.PI) / 180;
  const halfW = (textW * Math.cos(rad) + size * Math.sin(rad)) / 2;
  const halfH = (textW * Math.sin(rad) + size * Math.cos(rad)) / 2;
  const w = Math.ceil(4 * halfW + size * 2);
  const h = Math.ceil(Math.max(4 * halfH + size * 2, size * 6));
  const mark = (cx: number, cy: number) =>
    `<text x='${cx}' y='${cy}' text-anchor='middle' dominant-baseline='middle' font-size='${size}' ${font} fill='${fill}' fill-opacity='${opacity}' transform='rotate(${angle} ${cx} ${cy})'>${label}</text>`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    mark(w / 4, h / 4) +
    mark((3 * w) / 4, (3 * h) / 4) +
    `</svg>`;
  return {
    '--wm-image': `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
    '--wm-repeat': 'repeat',
    '--wm-position': '0 0',
    '--wm-size': 'auto',
  };
}
