import { describe, expect, it } from 'vitest';
import {
  MODEL_TEMPLATE,
  formatModelTemplate,
  parseHeight,
  parseMeasurements,
  parseModelTemplate,
} from './model-template';

const categories = [
  { id: 'c1', slug: 'sinh-vien', name: { vi: 'Sinh viên', en: 'Student' } },
  { id: 'c2', slug: 'van-phong', name: { vi: 'Văn phòng', en: 'Office' } },
];

describe('parseModelTemplate', () => {
  it('reads the standard block', () => {
    const p = parseModelTemplate(
      `Tên: Linh Chi
Chiều cao: 1m65
Cân nặng: 48kg
Số đo: 86-60-90
Năm sinh: 2002
Khu vực: Quận 1
Giá: 1.500k
Thể loại: Sinh viên, văn phòng
Giới thiệu: Dễ thương, nhiệt tình.
Nói chuyện vui.`,
      categories,
    );
    expect(p.stage_name).toBe('Linh Chi');
    expect(p.slug).toBe('linh-chi');
    expect(p.height_cm).toBe(165);
    expect([p.bust, p.waist, p.hips]).toEqual(['86', '60', '90']);
    expect(p.city).toBe('Quận 1');
    expect(p.category_ids).toEqual(['c1', 'c2']);
    expect(p.bio).toBe('Dễ thương, nhiệt tình.\nNói chuyện vui.');
    expect(p.details).toEqual([
      { label: { vi: 'Cân nặng', en: 'Weight' }, value: { vi: '48kg' } },
      { label: { vi: 'Năm sinh', en: 'Year of birth' }, value: { vi: '2002' } },
      { label: { vi: 'Giá', en: 'Price' }, value: { vi: '1.500k' } },
    ]);
    expect(p.warnings).toEqual([]);
  });

  it('skips the blank template without complaint', () => {
    const p = parseModelTemplate(MODEL_TEMPLATE, categories);
    expect(p.stage_name).toBe('');
    expect(p.details).toEqual([]);
    expect(p.warnings).toEqual([]);
  });

  it('ignores accents, case, bullets and emoji in keys', () => {
    const p = parseModelTemplate(
      `- TEN: Mai
• 📍 khu vuc: Hà Nội
* chieu cao : 170cm
Trang thai: hiện`,
      categories,
    );
    expect(p.stage_name).toBe('Mai');
    expect(p.city).toBe('Hà Nội');
    expect(p.height_cm).toBe(170);
    expect(p.status).toBe('published');
  });

  it('treats a bare first line as the name', () => {
    const p = parseModelTemplate(`Ngọc\nChiều cao: 160`, categories);
    expect(p.stage_name).toBe('Ngọc');
    expect(p.height_cm).toBe(160);
  });

  it('keeps unknown keys as detail rows and unknown categories as warnings', () => {
    const p = parseModelTemplate(
      `Tên: An
Zalo: 0900
Tình trạng phòng: có
Thể loại: Sinh viên / Hạng sang`,
      categories,
    );
    expect(p.details.map((d) => d.label.vi)).toEqual(['Zalo', 'Tình trạng phòng']);
    expect(p.category_ids).toEqual(['c1']);
    expect(p.unknownCategories).toEqual(['Hạng sang']);
    expect(p.warnings[0]).toMatch(/Hạng sang/);
  });

  it('does not mistake a URL for a key', () => {
    const p = parseModelTemplate(`Tên: An\nGiới thiệu: xem thêm\nhttps://t.me/abc`, categories);
    expect(p.bio).toBe('xem thêm\nhttps://t.me/abc');
    expect(p.details).toEqual([]);
  });

  it('falls back to a detail row when a number cannot be read', () => {
    const p = parseModelTemplate(`Tên: An\nChiều cao: cao ráo\nSố đo: chuẩn`, categories);
    expect(p.height_cm).toBeNull();
    expect(p.bust).toBe('');
    expect(p.details.map((d) => d.value.vi)).toEqual(['cao ráo', 'chuẩn']);
    expect(p.warnings).toHaveLength(2);
  });
});

describe('parseHeight', () => {
  it.each([
    ['165', 165],
    ['165cm', 165],
    ['1m65', 165],
    ['1.65m', 165],
    ['1,7m', 170],
    ['cao 1m58', null],
    ['99', null],
    ['abc', null],
  ])('%s → %s', (input, want) => {
    expect(parseHeight(input)).toBe(want);
  });
});

describe('parseMeasurements', () => {
  it.each([
    ['86-60-90', ['86', '60', '90']],
    ['86/60/90', ['86', '60', '90']],
    ['V1 88 V2 62 V3 92', ['88', '62', '92']],
    ['86 60', null],
  ])('%s', (input, want) => {
    expect(parseMeasurements(input)).toEqual(want);
  });
});

describe('formatModelTemplate', () => {
  it('round-trips through the parser', () => {
    const text = formatModelTemplate(
      {
        stage_name: 'Linh Chi',
        height_cm: 165,
        city: 'Quận 1',
        experience_years: 2,
        bust: '86',
        waist: '60',
        hips: '90',
        bio: 'Dễ thương.\nNhiệt tình.',
        category_ids: ['c2'],
        details: [{ label: { vi: 'Giá', en: 'Price' }, value: { vi: '1.500k' } }],
        status: 'published',
      },
      categories,
    );
    const p = parseModelTemplate(text, categories);
    expect(p.stage_name).toBe('Linh Chi');
    expect(p.height_cm).toBe(165);
    expect(p.city).toBe('Quận 1');
    expect(p.experience_years).toBe(2);
    expect([p.bust, p.waist, p.hips]).toEqual(['86', '60', '90']);
    expect(p.category_ids).toEqual(['c2']);
    expect(p.details).toEqual([
      { label: { vi: 'Giá', en: 'Price' }, value: { vi: '1.500k' } },
    ]);
    expect(p.status).toBe('published');
    expect(p.bio).toBe('Dễ thương.\nNhiệt tình.');
  });
});
