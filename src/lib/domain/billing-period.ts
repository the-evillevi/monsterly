import type { BillingPeriod } from '@/lib/local-db/monsterly-db';

import { formatDateOnly, parseDateOnly, todayDateOnly } from './date-only';

export const billingPeriodLabels: Record<BillingPeriod, string> = {
  bimonthly: 'Bimestral',
  custom: 'Personalizado',
  monthly: 'Mensual',
  six_monthly: 'Semestral',
  weekly: 'Semanal',
  yearly: 'Anual',
};

const monthsPerPeriod: Partial<Record<BillingPeriod, number>> = {
  bimonthly: 2,
  monthly: 1,
  six_monthly: 6,
  yearly: 12,
};

export function isValidCustomDays(days: number | null | undefined): days is number {
  return days != null && Number.isInteger(days) && days >= 1;
}

export function addBillingPeriod(
  date: string,
  billingPeriod: BillingPeriod,
  customDays?: number | null,
): string {
  if (billingPeriod === 'weekly') {
    return addDays(date, 7);
  }

  if (billingPeriod === 'custom') {
    if (!isValidCustomDays(customDays)) {
      throw new Error('Custom billing periods need a whole number of days of at least 1.');
    }

    return addDays(date, customDays);
  }

  return addMonthsClamped(date, monthsPerPeriod[billingPeriod] ?? 0);
}

export function nextPaidUntilDate(
  paidUntilDate: string,
  billingPeriod: BillingPeriod,
  customDays?: number | null,
  today = new Date(),
): string {
  // Renew from whichever is later so expired members start counting from today
  // while active members keep the days they already paid for.
  const todayValue = todayDateOnly(today);
  const base = paidUntilDate > todayValue ? paidUntilDate : todayValue;

  return addBillingPeriod(base, billingPeriod, customDays);
}

function addDays(date: string, days: number): string {
  const result = parseDateOnly(date);
  result.setDate(result.getDate() + days);

  return formatDateOnly(result);
}

function addMonthsClamped(date: string, months: number): string {
  const parsed = parseDateOnly(date);
  const result = new Date(parsed.getFullYear(), parsed.getMonth() + months, 1);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(parsed.getDate(), daysInTargetMonth));

  return formatDateOnly(result);
}
