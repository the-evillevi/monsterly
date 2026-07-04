import type { BillingPeriod } from '@/lib/local-db/monsterly-db';

import { formatDateOnly, parseDateOnly } from './date-only';

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

export function addBillingPeriod(
  date: string,
  billingPeriod: BillingPeriod,
  customDays?: number | null,
): string {
  if (billingPeriod === 'weekly') {
    return addDays(date, 7);
  }

  if (billingPeriod === 'custom') {
    if (customDays == null || !Number.isInteger(customDays) || customDays < 1) {
      throw new Error('Custom billing periods need a whole number of days of at least 1.');
    }

    return addDays(date, customDays);
  }

  return addMonthsClamped(date, monthsPerPeriod[billingPeriod] ?? 0);
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
