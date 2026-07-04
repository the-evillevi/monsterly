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
      plans: [],
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

  it('passes the phone number through and lists one plan per subscription kind', () => {
    const [summary] = buildSubscriberSummaries({
      subscribers: [{ id: 'subscriber-1', name: 'Mariana Soto', phone_number: '+52 55 1111 0001' }],
      subscriptions: [
        { kind: 'gym', paid_until_date: '2026-08-01', subscriber_id: 'subscriber-1' },
        { kind: 'crossfit', paid_until_date: '2026-08-15', subscriber_id: 'subscriber-1' },
        { kind: 'gym', paid_until_date: '2026-09-01', subscriber_id: 'subscriber-1' },
      ],
      today,
    });

    expect(summary).toMatchObject({
      phoneNumber: '+52 55 1111 0001',
      plans: ['Gym', 'CrossFit'],
    });
  });

  it('leaves the phone number undefined when the subscriber has none', () => {
    const [summary] = buildSubscriberSummaries({
      subscribers: [{ id: 'subscriber-1', name: 'Mariana Soto', phone_number: null }],
      subscriptions: [],
      today,
    });

    expect(summary?.phoneNumber).toBeUndefined();
  });
});
