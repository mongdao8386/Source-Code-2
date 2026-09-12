import { describe, expect, it } from 'vitest';
import { normalizeUsername, supportContacts } from './telegram';

describe('normalizeUsername', () => {
  it.each([
    ['@buomxoe_nam', 'buomxoe_nam'],
    ['buomxoe_nam', 'buomxoe_nam'],
    ['t.me/buomxoe_nam', 'buomxoe_nam'],
    ['https://t.me/buomxoe_nam/', 'buomxoe_nam'],
    ['https://t.me/BuomXoe?start=1', 'BuomXoe'],
    ['  @nam  ', 'nam'],
    ['', ''],
    // An invite link is not a username; it comes back untouched so the
    // validator can name it in the error.
    ['https://t.me/+WqoXDEndV3', '+WqoXDEndV3'],
  ])('%s → %s', (input, want) => {
    expect(normalizeUsername(input)).toBe(want);
  });
});

describe('supportContacts', () => {
  it('reads two people and links them', () => {
    const c = supportContacts({
      telegram_support: [
        { name: 'Admin Nam', username: '@buomxoe_nam' },
        { name: '', username: 'https://t.me/buomxoe_linh' },
      ],
    });
    expect(c).toEqual([
      { n: 1, name: 'Admin Nam', username: 'buomxoe_nam', url: 'https://t.me/buomxoe_nam', avatarPath: '' },
      { n: 2, name: '', username: 'buomxoe_linh', url: 'https://t.me/buomxoe_linh', avatarPath: '' },
    ]);
  });

  it('keeps an avatar only when it is a path this app uploaded', () => {
    const ok = 'brand/avatar-11111111-1111-4111-8111-111111111111.webp';
    const c = supportContacts({
      telegram_support: [
        { name: 'A', username: 'person_one', avatar_path: ok },
        { name: 'B', username: 'person_two', avatar_path: 'https://evil.example/x.png' },
      ],
    });
    expect(c.map((x) => x.avatarPath)).toEqual([ok, '']);
  });

  it('drops anything that is not a real username', () => {
    const c = supportContacts({
      telegram_support: [
        { name: 'x', username: '+WqoXDEndV3' },
        { name: 'y', username: 'abc' },
        { name: 'z', username: 'valid_one' },
        { name: 'w', username: 'fourth_person' },
      ],
    });
    // Only the first two slots count, and neither of those is valid.
    expect(c).toEqual([]);
  });

  it('tolerates junk', () => {
    expect(supportContacts({ telegram_support: null })).toEqual([]);
    expect(supportContacts({ telegram_support: 'nope' })).toEqual([]);
    expect(supportContacts({ telegram_support: [null, 5] })).toEqual([]);
    expect(supportContacts({})).toEqual([]);
  });
});
