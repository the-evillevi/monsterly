import { describe, expect, it } from 'vitest';

import {
  countUniqueCheckedInToday,
  formatRelativeTime,
  isWithinDuplicateWindow,
  startOfTodayIso,
} from './check-ins';

describe('startOfTodayIso', () => {
  it('returns the UTC instant of local midnight', () => {
    const now = new Date(2026, 6, 13, 15, 30);
    const expected = new Date(2026, 6, 13, 0, 0, 0, 0).toISOString();

    expect(startOfTodayIso(now)).toBe(expected);
  });
});

describe('isWithinDuplicateWindow', () => {
  const now = new Date('2026-07-13T18:00:00.000Z');

  it('treats a scan four minutes ago as a duplicate', () => {
    expect(isWithinDuplicateWindow('2026-07-13T17:56:00.000Z', now)).toBe(true);
  });

  it('treats a scan five minutes ago as a new visit', () => {
    expect(isWithinDuplicateWindow('2026-07-13T17:55:00.000Z', now)).toBe(false);
  });

  it('ignores clock-skewed future scans', () => {
    expect(isWithinDuplicateWindow('2026-07-13T18:01:00.000Z', now)).toBe(false);
  });
});

describe('countUniqueCheckedInToday', () => {
  const now = new Date(2026, 6, 13, 18, 0);
  const today = (hour: number) => new Date(2026, 6, 13, hour).toISOString();
  const yesterday = new Date(2026, 6, 12, 23, 59).toISOString();

  it('counts each member once regardless of repeat scans', () => {
    const checkIns = [
      { checked_in_at: today(7), subscriber_id: 'a' },
      { checked_in_at: today(9), subscriber_id: 'a' },
      { checked_in_at: today(10), subscriber_id: 'b' },
    ];

    expect(countUniqueCheckedInToday(checkIns, now)).toBe(2);
  });

  it('excludes scans from before local midnight', () => {
    const checkIns = [
      { checked_in_at: yesterday, subscriber_id: 'a' },
      { checked_in_at: today(6), subscriber_id: 'b' },
    ];

    expect(countUniqueCheckedInToday(checkIns, now)).toBe(1);
  });

  it('returns zero without scans', () => {
    expect(countUniqueCheckedInToday([], now)).toBe(0);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-13T18:00:00.000Z');

  it('labels scans under a minute as right now', () => {
    expect(formatRelativeTime('2026-07-13T17:59:30.000Z', now)).toBe('ahora mismo');
  });

  it('labels minutes, hours, and days', () => {
    expect(formatRelativeTime('2026-07-13T17:45:00.000Z', now)).toBe('hace 15 min');
    expect(formatRelativeTime('2026-07-13T14:00:00.000Z', now)).toBe('hace 4 h');
    expect(formatRelativeTime('2026-07-11T18:00:00.000Z', now)).toBe('hace 2 días');
  });
});
