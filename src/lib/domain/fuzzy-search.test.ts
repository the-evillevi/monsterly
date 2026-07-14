import { describe, expect, it } from 'vitest';

import { isWithinOneEdit, normalizeText, subscriberMatchesQuery } from './fuzzy-search';

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('José Ángel')).toBe('jose angel');
  });
});

describe('isWithinOneEdit', () => {
  it('accepts equal strings', () => {
    expect(isWithinOneEdit('ana', 'ana')).toBe(true);
  });

  it('accepts a single substitution', () => {
    expect(isWithinOneEdit('marta', 'marca')).toBe(true);
  });

  it('accepts a single insertion or deletion', () => {
    expect(isWithinOneEdit('martha', 'marta')).toBe(true);
    expect(isWithinOneEdit('marta', 'martha')).toBe(true);
  });

  it('accepts an adjacent transposition', () => {
    expect(isWithinOneEdit('gabriel', 'gabreil')).toBe(true);
  });

  it('rejects two or more edits', () => {
    expect(isWithinOneEdit('carlos', 'karlas')).toBe(false);
    expect(isWithinOneEdit('ana', 'anita')).toBe(false);
  });
});

describe('subscriberMatchesQuery', () => {
  const ana = { name: 'Ana José García', phoneNumber: '+52 55 1122 3344' };

  it('matches everything on an empty query', () => {
    expect(subscriberMatchesQuery(ana, '   ')).toBe(true);
  });

  it('matches accented names from an unaccented query', () => {
    expect(subscriberMatchesQuery(ana, 'jose')).toBe(true);
  });

  it('tolerates a single typo in a name word', () => {
    expect(subscriberMatchesQuery({ name: 'Martha López' }, 'marta')).toBe(true);
  });

  it('matches a partial phone by digits, ignoring formatting', () => {
    expect(subscriberMatchesQuery(ana, '5511')).toBe(true);
    expect(subscriberMatchesQuery(ana, '2233')).toBe(true);
  });

  it('requires every token to match', () => {
    expect(subscriberMatchesQuery(ana, 'ana garcia')).toBe(true);
    expect(subscriberMatchesQuery(ana, 'ana perez')).toBe(false);
  });

  it('does not fuzzy-match very short tokens', () => {
    // "ojo" is one edit from "ana"? no — but guards against loose 3-char noise.
    expect(subscriberMatchesQuery({ name: 'Ivan' }, 'ban')).toBe(false);
  });
});
