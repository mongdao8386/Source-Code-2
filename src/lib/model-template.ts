import type { I18nText, ModelDetail } from '@/lib/supabase/types';

/**
 * A model profile as a block of text.
 *
 * The people who run this site already keep every profile as a message —
 * "Tên: … / Chiều cao: … / Số đo: …" — written once and pasted wherever it is
 * needed. Adding a model to the CMS should be the same paste, not a second
 * transcription into twenty boxes. This module turns that text into the form
 * payload and back again.
 *
 * The rules are deliberately loose: any `Key: value` line is understood, keys
 * are matched without accents or case, a line with no key continues the line
 * above it, and anything that is not one of the fixed fields becomes a detail
 * row exactly as typed. Nothing is ever thrown away — an unrecognised key
 * still lands on the public page, just under its own label.
 *
 * Client-safe: pure functions, no server imports, so the CMS can show a live
 * preview from the same code that builds the payload.
 */

export type TemplateCategory = { id: string; slug: string; name: I18nText };

export type ParsedModel = {
  stage_name: string;
  slug: string;
  /** null when the text did not say — the caller keeps its own default. */
  status: 'draft' | 'published' | null;
  display_order: number | null;
  height_cm: number | null;
  city: string | null;
  experience_years: number | null;
  bust: string;
  waist: string;
  hips: string;
  shoe: string;
  hair: string;
  eyes: string;
  bio: string;
  category_ids: string[];
  details: ModelDetail[];
  /** Category names in the text that matched nothing in the CMS. */
  unknownCategories: string[];
  /** Things worth a second look before saving, in Vietnamese for the CMS. */
  warnings: string[];
};

/** The blank to copy. Blank values are skipped on parse, so it can be pasted as-is. */
export const MODEL_TEMPLATE = [
  'Tên: ',
  'Chiều cao: ',
  'Cân nặng: ',
  'Số đo: ',
  'Năm sinh: ',
  'Khu vực: ',
  'Giá: ',
  'Thể loại: ',
  'Giới thiệu: ',
].join('\n');

/** Accent-free, lowercase, single-spaced — how keys and category names are compared. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(s: string): string {
  return fold(s).replace(/\s+/g, '-');
}

type Fixed =
  | 'name'
  | 'slug'
  | 'status'
  | 'order'
  | 'height'
  | 'measurements'
  | 'city'
  | 'experience'
  | 'categories'
  | 'bio'
  | 'shoe'
  | 'hair'
  | 'eyes';

/** Folded key → fixed field. Add a spelling here and every paste learns it. */
const FIXED: Record<string, Fixed> = {
  // name
  ten: 'name', name: 'name', 'nghe danh': 'name', 'stage name': 'name', 'ten goi': 'name',
  'biet danh': 'name', nickname: 'name', 'ho ten': 'name', 'ten nguoi mau': 'name',
  // slug
  slug: 'slug', 'duong dan': 'slug',
  // status
  'trang thai': 'status', status: 'status',
  // display order
  'thu tu': 'order', order: 'order', 'display order': 'order', stt: 'order',
  // height
  'chieu cao': 'height', cao: 'height', height: 'height',
  // measurements
  'so do': 'measurements', '3 vong': 'measurements', 'ba vong': 'measurements',
  'so do 3 vong': 'measurements', 'so do ba vong': 'measurements', vong: 'measurements',
  measurements: 'measurements', 'so do co the': 'measurements',
  // city / area
  'khu vuc': 'city', 'thanh pho': 'city', tinh: 'city', city: 'city', area: 'city',
  'dia diem': 'city', 'noi o': 'city', 'dia chi': 'city', location: 'city', khu: 'city',
  // experience
  'kinh nghiem': 'experience', experience: 'experience', 'so nam kinh nghiem': 'experience',
  // categories
  'the loai': 'categories', loai: 'categories', category: 'categories',
  categories: 'categories', tags: 'categories', tag: 'categories', nhom: 'categories',
  'phan loai': 'categories', 'dich vu': 'categories',
  // bio
  'gioi thieu': 'bio', 'mo ta': 'bio', bio: 'bio', 'ghi chu': 'bio', note: 'bio',
  notes: 'bio', description: 'bio', 'mieu ta': 'bio', 'chi tiet': 'bio',
  'thong tin them': 'bio', 'thong tin': 'bio', 'gioi thieu ban than': 'bio',
  // measurements block extras
  giay: 'shoe', 'co giay': 'shoe', 'size giay': 'shoe', shoe: 'shoe', shoes: 'shoe',
  toc: 'hair', 'mau toc': 'hair', hair: 'hair',
  mat: 'eyes', 'mau mat': 'eyes', eyes: 'eyes',
};

/**
 * English labels for detail rows whose Vietnamese label is a common one, so
 * the EN page reads properly without a translate click. Anything not listed
 * keeps an empty EN label and falls back to the Vietnamese on the EN page.
 */
const DETAIL_EN: Record<string, string> = {
  'can nang': 'Weight',
  nang: 'Weight',
  'nam sinh': 'Year of birth',
  tuoi: 'Age',
  gia: 'Price',
  'gia tham khao': 'Price',
  'quoc tich': 'Nationality',
  'ngon ngu': 'Languages',
  'co trang phuc': 'Dress size',
  'hinh xam': 'Tattoos',
  'xo khuyen': 'Piercings',
  'ky nang': 'Skills',
  'bang lai xe': 'Driving licence',
  'thoi gian': 'Hours',
  'gio lam viec': 'Working hours',
  'gio': 'Hours',
  'mau da': 'Skin tone',
  da: 'Skin',
  'vong 1': 'Bust',
  'vong 2': 'Waist',
  'vong 3': 'Hips',
  'tinh cach': 'Personality',
  'so thich': 'Interests',
  'hoc van': 'Education',
  'nghe nghiep': 'Occupation',
  zalo: 'Zalo',
  'so dien thoai': 'Phone',
  'dien thoai': 'Phone',
  'lien he': 'Contact',
  'luu y': 'Note',
  'qua dem': 'Overnight',
  'di tinh': 'Travel',
};

const KEY_LINE = /^\s*([^:：\n]{1,40}?)\s*[:：]\s*(.*)$/u;
const BULLET = /^\s*(?:[-–—•*·▪●]|\d+[.)])\s+/;

/** The label as typed, minus a leading bullet or emoji: "📍 Khu vực" → "Khu vực". */
function cleanKey(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+/g, ' ').trim();
}

/** "1m65", "1.65m", "165cm", "165" → 165; anything else → null. */
export function parseHeight(v: string): number | null {
  const s = fold(v).replace(/\s+/g, '');
  let cm: number | null = null;
  const metres = s.match(/^(\d)m?[.,]?(\d{1,2})m?$/);
  if (metres) {
    cm = Number(metres[1]) * 100 + Number(metres[2]!.padEnd(2, '0'));
  } else {
    const n = s.match(/(\d{2,3})/);
    if (n) cm = Number(n[1]);
  }
  return cm != null && cm >= 120 && cm <= 230 ? cm : null;
}

/** "86-60-90", "86/60/90", "V1 86 V2 60 V3 90", "86 60 90" → three strings. */
export function parseMeasurements(v: string): [string, string, string] | null {
  const nums = v.match(/\d{2,3}(?:[.,]\d)?/g);
  if (!nums || nums.length < 3) return null;
  return [nums[0]!, nums[1]!, nums[2]!];
}

function parseStatus(v: string): 'draft' | 'published' | null {
  const s = fold(v);
  if (/\b(hien|public|publish|published|dang|on|live|xuat ban|bat|mo)\b/.test(s)) return 'published';
  if (/\b(nhap|draft|an|off|tat|dong|hidden)\b/.test(s)) return 'draft';
  return null;
}

function splitList(v: string): string[] {
  return v
    .split(/[,;|/·•+]+|\s+(?:và|va|and)\s+/i)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseModelTemplate(
  text: string,
  categories: TemplateCategory[],
): ParsedModel {
  const out: ParsedModel = {
    stage_name: '',
    slug: '',
    status: null,
    display_order: null,
    height_cm: null,
    city: null,
    experience_years: null,
    bust: '',
    waist: '',
    hips: '',
    shoe: '',
    hair: '',
    eyes: '',
    bio: '',
    category_ids: [],
    details: [],
    unknownCategories: [],
    warnings: [],
  };

  // Gather lines into (key, value) pairs first; continuation lines attach to
  // the entry above them. The bio is the only field that keeps its line
  // breaks, everything else joins with a space.
  type Entry = { key: string; value: string; fixed: Fixed | null };
  const entries: Entry[] = [];
  let current: Entry | null = null;

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(BULLET, '');
    if (!line.trim()) {
      // A blank line ends a bio paragraph but is otherwise nothing.
      if (current?.fixed === 'bio') current.value += '\n';
      continue;
    }

    const m = line.match(KEY_LINE);
    const key = m ? cleanKey(m[1]!) : '';
    const looksLikeKey =
      m && key !== '' && /\p{L}/u.test(key) && !/^https?$/i.test(key) && !/^\d+$/.test(key);

    if (looksLikeKey) {
      current = { key, value: m![2]!.trim(), fixed: FIXED[fold(key)] ?? null };
      entries.push(current);
      continue;
    }

    if (current) {
      current.value = current.fixed === 'bio'
        ? `${current.value}${current.value.endsWith('\n') || !current.value ? '' : '\n'}${line.trim()}`
        : `${current.value} ${line.trim()}`.trim();
      continue;
    }

    // Text before any key. A bare first line is almost always the name; the
    // rest is a bio that was never labelled.
    if (!out.stage_name && !entries.some((e) => e.fixed === 'name')) {
      out.stage_name = line.trim();
    } else {
      current = { key: '', value: line.trim(), fixed: 'bio' };
      entries.push(current);
    }
  }

  for (const e of entries) {
    const v = e.value.trim();
    if (!v) continue; // a template line left blank

    switch (e.fixed) {
      case 'name':
        out.stage_name = v;
        break;
      case 'slug':
        out.slug = slugify(v);
        break;
      case 'status': {
        const s = parseStatus(v);
        if (s) out.status = s;
        else out.warnings.push(`Trạng thái “${v}” không hiểu — dùng hiện/ẩn.`);
        break;
      }
      case 'order': {
        const n = Number(v.match(/\d+/)?.[0]);
        if (Number.isFinite(n)) out.display_order = n;
        break;
      }
      case 'height': {
        const h = parseHeight(v);
        if (h) out.height_cm = h;
        else {
          out.warnings.push(`Chiều cao “${v}” không đọc được — đã đưa vào chi tiết thêm.`);
          out.details.push(row(e.key, v));
        }
        break;
      }
      case 'measurements': {
        const mm = parseMeasurements(v);
        if (mm) [out.bust, out.waist, out.hips] = mm;
        else {
          out.warnings.push(`Số đo “${v}” cần 3 số (vd 86-60-90) — đã đưa vào chi tiết thêm.`);
          out.details.push(row(e.key, v));
        }
        break;
      }
      case 'city':
        out.city = v;
        break;
      case 'experience': {
        const n = Number(v.match(/\d+/)?.[0]);
        if (Number.isFinite(n) && n >= 0 && n <= 60) out.experience_years = n;
        else out.details.push(row(e.key, v));
        break;
      }
      case 'categories': {
        for (const name of splitList(v)) {
          const want = fold(name);
          const hit = categories.find(
            (c) =>
              fold(c.name?.vi ?? '') === want ||
              fold(c.name?.en ?? '') === want ||
              fold(c.slug) === want,
          );
          if (hit) {
            if (!out.category_ids.includes(hit.id)) out.category_ids.push(hit.id);
          } else {
            out.unknownCategories.push(name);
          }
        }
        break;
      }
      case 'bio':
        out.bio = out.bio ? `${out.bio}\n${v}` : v;
        break;
      case 'shoe':
        out.shoe = v;
        break;
      case 'hair':
        out.hair = v;
        break;
      case 'eyes':
        out.eyes = v;
        break;
      default:
        out.details.push(row(e.key, v));
    }
  }

  out.bio = out.bio.trim();
  if (out.stage_name && !out.slug) out.slug = slugify(out.stage_name);
  if (out.unknownCategories.length) {
    out.warnings.push(
      `Thể loại chưa có trong CMS: ${out.unknownCategories.join(', ')} — bỏ qua, tạo ở mục Thể loại nếu cần.`,
    );
  }
  return out;
}

function row(label: string, value: string): ModelDetail {
  const en = DETAIL_EN[fold(label)];
  return {
    label: en ? { vi: label, en } : { vi: label },
    value: { vi: value },
  };
}

/**
 * The reverse: a saved profile as the same block of text, so an existing
 * model can be copied, edited and pasted in as a new one. The bio goes last
 * because it is the one field allowed to run over several lines.
 */
export function formatModelTemplate(
  m: {
    stage_name: string;
    height_cm?: number | string | null;
    city?: string | null;
    experience_years?: number | string | null;
    bust?: string;
    waist?: string;
    hips?: string;
    shoe?: string;
    hair?: string;
    eyes?: string;
    bio?: string;
    category_ids?: string[];
    details?: ModelDetail[];
    status?: string;
  },
  categories: TemplateCategory[],
): string {
  const lines: string[] = [`Tên: ${m.stage_name ?? ''}`];
  const push = (k: string, v: unknown) => {
    const s = v == null ? '' : String(v).trim();
    if (s) lines.push(`${k}: ${s}`);
  };

  push('Chiều cao', m.height_cm);
  const mm = [m.bust, m.waist, m.hips].map((x) => (x ?? '').trim());
  if (mm.every(Boolean)) push('Số đo', mm.join('-'));
  push('Khu vực', m.city);
  push('Kinh nghiệm', m.experience_years);
  push('Giày', m.shoe);
  push('Tóc', m.hair);
  push('Mắt', m.eyes);

  const names = (m.category_ids ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => c!.name?.vi || c!.name?.en || c!.slug);
  if (names.length) push('Thể loại', names.join(', '));

  for (const d of m.details ?? []) {
    const label = (d.label?.vi || d.label?.en || '').trim();
    const value = (d.value?.vi || d.value?.en || '').trim();
    if (label && value) lines.push(`${label}: ${value.replace(/\s*\n\s*/g, ' ')}`);
  }

  if (m.status === 'published') push('Trạng thái', 'hiện');
  push('Giới thiệu', m.bio);
  return lines.join('\n');
}
