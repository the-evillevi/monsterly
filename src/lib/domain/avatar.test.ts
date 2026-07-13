import { describe, expect, it } from 'vitest';

import { avatarToneCount, avatarToneIndex, subscriberInitials } from './avatar';

describe('subscriberInitials', () => {
  it('uses the first name and paternal last name', () => {
    expect(subscriberInitials({ name: 'Ana', paternal_last_name: 'Torres' })).toBe('AT');
  });

  it('falls back to the second word of the name without a paternal last name', () => {
    expect(subscriberInitials({ name: 'Ana Torres' })).toBe('AT');
  });

  it('returns a single initial for a single-word name', () => {
    expect(subscriberInitials({ name: 'Ana' })).toBe('A');
  });

  it('uppercases accented initials', () => {
    expect(subscriberInitials({ name: 'ángel', paternal_last_name: 'castañeda' })).toBe('ÁC');
  });

  it('ignores surrounding whitespace', () => {
    expect(subscriberInitials({ name: '  Ana  ', paternal_last_name: '  Torres ' })).toBe('AT');
  });
});

describe('avatarToneIndex', () => {
  it('is deterministic for the same id', () => {
    expect(avatarToneIndex('subscriber-1')).toBe(avatarToneIndex('subscriber-1'));
  });

  it('stays within the tone palette bounds', () => {
    for (const id of ['a', 'subscriber-2', '019f56a2-46d5-71f8-b02c-d888e734e3e3']) {
      const index = avatarToneIndex(id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(avatarToneCount);
    }
  });

  it('spreads different ids across tones', () => {
    const tones = new Set(
      Array.from({ length: 40 }, (_, index) => avatarToneIndex(`subscriber-${index}`)),
    );
    expect(tones.size).toBeGreaterThan(4);
  });
});
