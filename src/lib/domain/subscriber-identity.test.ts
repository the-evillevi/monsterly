import { describe, expect, it } from 'vitest';

import {
  formatFullName,
  generateCheckInCode,
  generateSlug,
  newEntityId,
  slugify,
  subscriberUrlSegment,
} from './subscriber-identity';

describe('newEntityId', () => {
  it('produces UUIDv7 strings', () => {
    expect(newEntityId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('sorts chronologically', () => {
    const first = newEntityId();
    const second = newEntityId();

    expect(first < second).toBe(true);
  });
});

describe('subscriberUrlSegment', () => {
  it('prefers the slug and falls back to the id', () => {
    expect(subscriberUrlSegment({ id: 'uuid-1', slug: 'ana-torres-x2k4' })).toBe('ana-torres-x2k4');
    expect(subscriberUrlSegment({ id: 'uuid-1', slug: null })).toBe('uuid-1');
    expect(subscriberUrlSegment({ id: 'uuid-1' })).toBe('uuid-1');
  });
});

describe('slugify', () => {
  it('strips accents and non-alphanumerics', () => {
    expect(slugify('Dulce Palomino')).toBe('dulce-palomino');
    expect(slugify('  José  Ramírez  ')).toBe('jose-ramirez');
    expect(slugify('Ricardo (Michi)')).toBe('ricardo-michi');
    expect(slugify('Norma Angélica M.')).toBe('norma-angelica-m');
  });
});

describe('generateSlug', () => {
  it('appends a 4-char unambiguous suffix', () => {
    expect(generateSlug('Dulce Palomino')).toMatch(
      /^dulce-palomino-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/,
    );
  });

  it('still yields a suffix when the name slugifies to nothing', () => {
    expect(generateSlug('...')).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{4}$/);
  });
});

describe('generateCheckInCode', () => {
  it('produces 6-digit PINs without a leading zero', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateCheckInCode()).toMatch(/^[1-9][0-9]{5}$/);
    }
  });
});

describe('formatFullName', () => {
  it('joins the present name parts', () => {
    expect(
      formatFullName({ name: 'Dulce', paternal_last_name: 'Palomino', maternal_last_name: null }),
    ).toBe('Dulce Palomino');
    expect(
      formatFullName({
        name: 'Dulce',
        paternal_last_name: 'Palomino',
        maternal_last_name: 'García',
      }),
    ).toBe('Dulce Palomino García');
    expect(formatFullName({ name: 'Ricardo (Michi)' })).toBe('Ricardo (Michi)');
  });

  it('trims stray whitespace in parts', () => {
    expect(formatFullName({ name: ' Iliana ', paternal_last_name: 'Pérez ' })).toBe('Iliana Pérez');
  });
});
