import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import type { SubscriptionStatus } from '@/lib/domain/subscriber-summaries';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { SubscriberList } from './subscriber-list';

async function renderList(filterStatus?: SubscriptionStatus) {
  const context = await createTestDataContext();

  render(
    <DataLayerContext.Provider value={context}>
      <MemoryRouter>
        <SubscriberList filterStatus={filterStatus} />
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );

  return context;
}

describe('SubscriberList', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('shows name, status badge, phone link, and one badge per subscription kind', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, {
      id: 'subscriber-1',
      name: 'Mariana Soto',
      phone_number: '+52 55 1111 0001',
    });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2199-12-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-2',
      kind: 'crossfit',
      paid_until_date: '2199-12-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    render(
      <DataLayerContext.Provider value={context}>
        <MemoryRouter>
          <SubscriberList />
        </MemoryRouter>
      </DataLayerContext.Provider>,
    );

    expect(await screen.findByText('Mariana Soto')).toBeInTheDocument();
    expect(screen.getByText('Al corriente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+52 55 1111 0001' })).toHaveAttribute(
      'href',
      'tel:+525511110001',
    );
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('CrossFit')).toBeInTheDocument();
    // The edit link routes by slug, never by the primary key.
    expect(
      screen.getByRole('link', { name: 'Editar Mariana Soto' }).getAttribute('href'),
    ).toMatch(/^\/subscribers\/mariana-soto-[a-z2-9]{4}\/edit$/);
  });

  it('shows a single Sin suscripción badge and no plan badges without subscriptions', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Carlos Perez' });

    render(
      <DataLayerContext.Provider value={context}>
        <MemoryRouter>
          <SubscriberList />
        </MemoryRouter>
      </DataLayerContext.Provider>,
    );

    expect(await screen.findByText('Carlos Perez')).toBeInTheDocument();
    expect(screen.getAllByText('Sin suscripción')).toHaveLength(1);
    expect(screen.queryByText('Gym')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /\+52/ })).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    const context = await renderList('Vencido');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Al Día' });
    await saveSubscriber(context, { id: 'subscriber-2', name: 'Atrasado' });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2199-12-31',
      start_date: '2026-06-01',
      subscriber_id: 'subscriber-1',
    });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-2',
      kind: 'gym',
      paid_until_date: '2020-01-01',
      start_date: '2019-12-01',
      subscriber_id: 'subscriber-2',
    });

    expect(await screen.findByText('Atrasado')).toBeInTheDocument();
    expect(screen.queryByText('Al Día')).not.toBeInTheDocument();
  });
});
