import { describe, expect, it } from 'vitest';

import { buildSubscriberSummaries } from './subscriber-summaries';

const today = new Date('2026-07-02T12:00:00');

describe('buildSubscriberSummaries', () => {
  it('marks subscribers without subscriptions as Sin suscripción', () => {
    const [summary] = buildSubscriberSummaries({
      subscribers: [{ id: 'subscriber-1', name: 'Mariana Soto' }],
      subscriptions: [],
      today,
    });

    expect(summary).toMatchObject({
      paidUntilDate: undefined,
      paidUntilLabel: 'Sin suscripción',
      plan: 'Sin suscripción',
      status: 'Sin suscripción',
    });
  });

  it('keeps the traffic-light statuses for subscribers with subscriptions', () => {
    const summaries = buildSubscriberSummaries({
      subscribers: [
        { id: 'subscriber-1', name: 'Al Corriente' },
        { id: 'subscriber-2', name: 'Por Vencer' },
        { id: 'subscriber-3', name: 'Vencido' },
      ],
      subscriptions: [
        { kind: 'gym', paid_until_date: '2026-08-01', subscriber_id: 'subscriber-1' },
        { kind: 'gym', paid_until_date: '2026-07-04', subscriber_id: 'subscriber-2' },
        { kind: 'gym', paid_until_date: '2026-07-01', subscriber_id: 'subscriber-3' },
      ],
      today,
    });

    expect(summaries.map((summary) => summary.status)).toEqual([
      'Al corriente',
      'Por vencer',
      'Vencido',
    ]);
  });
});
