import type { DayVisitDocument, DayVisitType, PlanFacility } from '@/lib/local-db/monsterly-db';

export type DayVisitOption = {
  facilities: readonly PlanFacility[];
  label: string;
  price: number;
  type: DayVisitType;
};

export const dayVisitOptions: readonly DayVisitOption[] = [
  { facilities: ['dragonz'], label: 'Gimnasio', price: 40, type: 'gym' },
  { facilities: ['monsters'], label: 'CrossFit', price: 60, type: 'crossfit' },
  { facilities: ['dragonz', 'monsters'], label: 'Ambos', price: 80, type: 'both' },
];

const dayVisitOptionsByType = new Map(dayVisitOptions.map((option) => [option.type, option]));

export function getDayVisitOption(type: DayVisitType): DayVisitOption {
  const option = dayVisitOptionsByType.get(type);

  if (!option) {
    throw new Error('Unsupported day visit type.');
  }

  return option;
}

export function formatDayVisitPrice(price: number): string {
  return `$${price.toLocaleString('es-MX')}`;
}

export function summarizeDayVisits(visits: readonly DayVisitDocument[], visitDate: string) {
  const visitsForDate = visits.filter((visit) => visit.visit_date === visitDate);

  return {
    count: visitsForDate.length,
    total: visitsForDate.reduce((sum, visit) => sum + visit.price, 0),
  };
}
