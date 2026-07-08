import { describe, expect, it } from 'vitest';

import { addBillingPeriod, nextPaidUntilDate } from './billing-period';

describe('addBillingPeriod', () => {
  it('adds seven days for weekly periods', () => {
    expect(addBillingPeriod('2026-07-04', 'weekly')).toBe('2026-07-11');
  });

  it('crosses month boundaries for weekly periods', () => {
    expect(addBillingPeriod('2026-07-28', 'weekly')).toBe('2026-08-04');
  });

  it('adds one calendar month for monthly periods', () => {
    expect(addBillingPeriod('2026-07-04', 'monthly')).toBe('2026-08-04');
  });

  it('clamps monthly periods to the end of shorter months', () => {
    expect(addBillingPeriod('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('keeps the leap day when clamping in leap years', () => {
    expect(addBillingPeriod('2028-01-31', 'monthly')).toBe('2028-02-29');
  });

  it('adds two months for bimonthly periods', () => {
    expect(addBillingPeriod('2026-12-31', 'bimonthly')).toBe('2027-02-28');
  });

  it('adds six months for six-monthly periods', () => {
    expect(addBillingPeriod('2026-08-31', 'six_monthly')).toBe('2027-02-28');
  });

  it('adds twelve months for yearly periods', () => {
    expect(addBillingPeriod('2026-07-04', 'yearly')).toBe('2027-07-04');
  });

  it('clamps a leap day when adding a year', () => {
    expect(addBillingPeriod('2028-02-29', 'yearly')).toBe('2029-02-28');
  });

  it('adds the given days for custom periods', () => {
    expect(addBillingPeriod('2026-07-04', 'custom', 10)).toBe('2026-07-14');
  });

  it('rejects custom periods without days', () => {
    expect(() => addBillingPeriod('2026-07-04', 'custom')).toThrow();
  });

  it('rejects custom periods with less than one day', () => {
    expect(() => addBillingPeriod('2026-07-04', 'custom', 0)).toThrow();
  });

  it('rejects custom periods with fractional days', () => {
    expect(() => addBillingPeriod('2026-07-04', 'custom', 7.5)).toThrow();
  });
});

describe('nextPaidUntilDate', () => {
  const today = new Date(2026, 6, 4);

  it('extends an active subscription from its paid-until date', () => {
    expect(nextPaidUntilDate('2026-07-20', 'monthly', undefined, today)).toBe('2026-08-20');
  });

  it('renews an expired subscription from today', () => {
    expect(nextPaidUntilDate('2026-06-20', 'monthly', undefined, today)).toBe('2026-08-04');
  });

  it('renews a subscription expiring today from today', () => {
    expect(nextPaidUntilDate('2026-07-04', 'weekly', undefined, today)).toBe('2026-07-11');
  });

  it('renews custom periods with the given days', () => {
    expect(nextPaidUntilDate('2026-06-01', 'custom', 15, today)).toBe('2026-07-19');
  });
});
