import { describe, expect, it } from 'vitest';
import { readFeedbackMedia, readRating } from './feedback';

const id = '11111111-1111-4111-8111-111111111111';

describe('readFeedbackMedia', () => {
  it('keeps only paths the upload route writes, and infers the kind', () => {
    const m = readFeedbackMedia([
      { path: `feedback/${id}.webp`, width: 800, height: 1200 },
      { path: `feedback/${id}.mp4` },
      { path: `feedback/${id}.webm`, kind: 'image' },
      { path: `brand/logo-${id}.webp` },
      { path: 'https://evil.example/x.webp' },
      { path: `feedback/../${id}.webp` },
      null,
      'junk',
    ]);
    expect(m).toEqual([
      { kind: 'image', path: `feedback/${id}.webp`, width: 800, height: 1200, poster: undefined },
      { kind: 'video', path: `feedback/${id}.mp4`, width: undefined, height: undefined, poster: undefined },
      { kind: 'video', path: `feedback/${id}.webm`, width: undefined, height: undefined, poster: undefined },
    ]);
  });

  it('keeps a poster only on video, and only from the upload route', () => {
    const m = readFeedbackMedia([
      { path: `feedback/${id}.mp4`, poster: `feedback/${id}-poster.webp` },
      { path: `feedback/${id}.mp4`, poster: 'https://evil.example/p.webp' },
      { path: `feedback/${id}.webp`, poster: `feedback/${id}-poster.webp` },
    ]);
    expect(m.map((x) => x.poster)).toEqual([`feedback/${id}-poster.webp`, undefined, undefined]);
  });

  it('tolerates anything that is not a list', () => {
    expect(readFeedbackMedia(null)).toEqual([]);
    expect(readFeedbackMedia('x')).toEqual([]);
    expect(readFeedbackMedia({ path: `feedback/${id}.webp` })).toEqual([]);
  });

  it('drops bogus dimensions rather than the entry', () => {
    const [m] = readFeedbackMedia([{ path: `feedback/${id}.webp`, width: -5, height: 'tall' }]);
    expect(m).toEqual({ kind: 'image', path: `feedback/${id}.webp`, width: undefined, height: undefined, poster: undefined });
  });
});

describe('readRating', () => {
  it.each([
    [5, 5],
    ['4', 4],
    [3.6, 4],
    [0, null],
    [6, null],
    [null, null],
    ['x', null],
  ])('%s → %s', (input, want) => {
    expect(readRating(input)).toBe(want);
  });
});
