import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localDayKey, millisecondsUntilNextLocalDay, useLocalDayKey } from './use-local-day-key';

describe('useLocalDayKey', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the local calendar day without UTC drift', () => {
    expect(localDayKey(new Date(2026, 6, 14, 23, 30))).toBe('2026-07-14');
  });

  it('schedules the next refresh just after local midnight', () => {
    expect(millisecondsUntilNextLocalDay(new Date(2026, 6, 14, 23, 59, 59, 900))).toBe(110);
  });

  it('updates when a long-lived tab crosses midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 14, 23, 59, 59, 900));
    const { result } = renderHook(() => useLocalDayKey());

    expect(result.current).toBe('2026-07-14');

    act(() => vi.advanceTimersByTime(110));

    expect(result.current).toBe('2026-07-15');
  });
});
