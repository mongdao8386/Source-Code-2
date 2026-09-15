import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTECTION, readProtection, watermarkCss } from './protection';

describe('readProtection', () => {
  it('fills defaults from nothing', () => {
    expect(readProtection(null)).toEqual(DEFAULT_PROTECTION);
    expect(readProtection({})).toEqual(DEFAULT_PROTECTION);
    expect(readProtection('junk')).toEqual(DEFAULT_PROTECTION);
  });

  it('clamps numbers and rejects unknown enums', () => {
    const p = readProtection({
      watermark: { opacity: 5, size: 999, angle: -400, mode: 'sideways', color: 'pink', text: 'x'.repeat(80) },
      blockShortcuts: 'yes',
    });
    expect(p.watermark.opacity).toBe(0.6);
    expect(p.watermark.size).toBe(48);
    expect(p.watermark.angle).toBe(-60);
    expect(p.watermark.mode).toBe('tile');
    expect(p.watermark.color).toBe('light');
    expect(p.watermark.text).toHaveLength(40);
    expect(p.blockShortcuts).toBe(true);
  });

  it('keeps explicit false', () => {
    const p = readProtection({ watermark: { enabled: false }, hideOnBlur: false });
    expect(p.watermark.enabled).toBe(false);
    expect(p.hideOnBlur).toBe(false);
  });
});

describe('watermarkCss', () => {
  it('is empty when disabled or without any text', () => {
    const off = readProtection({ watermark: { enabled: false } });
    expect(watermarkCss(off, 'BRAND')['--wm-image']).toBe('none');
    expect(watermarkCss(DEFAULT_PROTECTION, '')['--wm-image']).toBe('none');
  });

  it('falls back to the brand name and upper-cases it', () => {
    const css = watermarkCss(DEFAULT_PROTECTION, 'Bướm Xoè');
    expect(css['--wm-repeat']).toBe('repeat');
    expect(decodeURIComponent(css['--wm-image'])).toContain('BƯỚM XOÈ');
  });

  it('escapes text that would break the SVG', () => {
    const p = readProtection({ watermark: { text: `a<b>&"c'` } });
    const svg = decodeURIComponent(watermarkCss(p, 'x')['--wm-image']);
    expect(svg).toContain('A&lt;B&gt;&amp;&quot;C&apos;');
    expect(svg).not.toContain('<b>');
  });

  it('places a corner mark bottom-right without repeating', () => {
    const p = readProtection({ watermark: { mode: 'corner', text: '@site' } });
    const css = watermarkCss(p, 'x');
    expect(css['--wm-repeat']).toBe('no-repeat');
    expect(css['--wm-position']).toBe('right bottom');
  });
});
