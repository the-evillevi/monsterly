import { describe, expect, it } from 'vitest';

import { dayVisitOptions, getDayVisitOption, summarizeDayVisits } from './day-visits';

describe('day visits', () => {
  it('maps the fixed price list to the two facilities', () => {
    expect(dayVisitOptions).toEqual([
      { facilities: ['dragonz'], label: 'Gimnasio', price: 40, type: 'gym' },
      { facilities: ['monsters'], label: 'CrossFit', price: 60, type: 'crossfit' },
      { facilities: ['dragonz', 'monsters'], label: 'Ambos', price: 80, type: 'both' },
    ]);
    expect(getDayVisitOption('both').price).toBe(80);
  });

  it('totals only the selected calendar day from stored prices', () => {
    const base = {
      _deleted: false,
      _modified: '2026-07-15T12:00:00.000Z',
      created_at: '2026-07-15T12:00:00.000Z',
      organization_id: 'organization-1',
      subscriber_id: null,
      updated_at: '2026-07-15T12:00:00.000Z',
    };
    const visits = [
      { ...base, id: '1', price: 40, visit_date: '2026-07-15', visit_type: 'gym' as const },
      { ...base, id: '2', price: 65, visit_date: '2026-07-15', visit_type: 'crossfit' as const },
      { ...base, id: '3', price: 80, visit_date: '2026-07-14', visit_type: 'both' as const },
    ];

    expect(summarizeDayVisits(visits, '2026-07-15')).toEqual({ count: 2, total: 105 });
  });
});
