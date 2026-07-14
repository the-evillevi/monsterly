import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { SubscriberSummary } from '@/lib/domain/subscriber-summaries';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import { SubscriberList } from './subscriber-list';

function summary(overrides: Partial<SubscriberSummary> = {}): SubscriberSummary {
  return {
    id: 'subscriber-1',
    name: 'Mariana Soto',
    nameParts: { name: 'Mariana', paternal_last_name: 'Soto' },
    paidUntilLabel: 'Sin suscripción',
    plans: [],
    status: 'Al corriente',
    ...overrides,
  };
}

function renderList(
  summaries: SubscriberSummary[],
  subscriptionsBySubscriber = new Map<string, SubscriptionDocument[]>(),
) {
  render(
    <MemoryRouter>
      <SubscriberList subscriptionsBySubscriber={subscriptionsBySubscriber} summaries={summaries} />
    </MemoryRouter>,
  );
}

describe('SubscriberList', () => {
  it('shows name, status badge, phone link, plan badges, and the slug edit link', () => {
    renderList([
      summary({
        paidUntilDate: '2199-12-31',
        paidUntilLabel: '31 dic',
        phoneNumber: '+52 55 1111 0001',
        plans: ['Gym', 'CrossFit'],
        slug: 'mariana-soto-ab12',
      }),
    ]);

    expect(screen.getByText('Mariana Soto')).toBeInTheDocument();
    expect(screen.getByText('Al corriente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+52 55 1111 0001' })).toHaveAttribute(
      'href',
      'tel:+525511110001',
    );
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('CrossFit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar Mariana Soto' })).toHaveAttribute(
      'href',
      '/subscribers/mariana-soto-ab12/edit',
    );
  });

  it('offers Renovar only when the member has subscriptions', () => {
    const withSubscription = summary({ id: 'with-sub', name: 'Con Suscripción', slug: 'con-sub' });
    const withoutSubscription = summary({
      id: 'no-sub',
      name: 'Sin Suscripción',
      slug: 'sin-sub',
      status: 'Sin suscripción',
    });

    renderList(
      [withSubscription, withoutSubscription],
      new Map([
        [
          'with-sub',
          [
            {
              billing_period: 'monthly',
              id: 'subscription-1',
              kind: 'gym',
              paid_until_date: '2199-12-31',
              start_date: '2026-07-01',
            } as SubscriptionDocument,
          ],
        ],
      ]),
    );

    // One Renovar button — the member without subscriptions has none.
    expect(screen.getAllByRole('button', { name: 'Renovar' })).toHaveLength(1);
  });

  it('renders an empty state when there are no matches', () => {
    renderList([]);

    expect(screen.getByText('No hay suscriptores que coincidan.')).toBeInTheDocument();
  });
});
