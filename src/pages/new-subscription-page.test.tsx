import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { listSubscriptions } from '@/lib/data/subscriptions.queries';
import { addBillingPeriod } from '@/lib/domain/billing-period';
import { todayDateOnly } from '@/lib/domain/date-only';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { NewSubscriptionPage } from './new-subscription-page';

async function renderNewSubscriptionPage(subscriberId: string) {
  const context = await createTestDataContext();

  render(
    <DataLayerContext.Provider value={context}>
      <MemoryRouter initialEntries={[`/subscribers/${subscriberId}/subscriptions/new`]}>
        <Routes>
          <Route path="/subscribers/:slug/edit" element={<p>edit-subscriber</p>} />
          <Route path="/subscribers/:slug/subscriptions/new" element={<NewSubscriptionPage />} />
        </Routes>
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );

  return context;
}

describe('NewSubscriptionPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('saves a gym subscription with the suggested monthly dates', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();

    const today = todayDateOnly();
    const [subscription] = await listSubscriptions(context);
    expect(subscription).toMatchObject({
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: addBillingPeriod(today, 'monthly'),
      start_date: today,
      subscriber_id: 'subscriber-1',
    });
  });

  it('saves a weekly CrossFit subscription', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.change(await screen.findByLabelText('Tipo'), { target: { value: 'crossfit' } });
    fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: 'weekly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();

    const today = todayDateOnly();
    const [subscription] = await listSubscriptions(context);
    expect(subscription).toMatchObject({
      billing_period: 'weekly',
      kind: 'crossfit',
      paid_until_date: addBillingPeriod(today, 'weekly'),
      start_date: today,
    });
  });

  it('saves a custom period with the given days', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.change(await screen.findByLabelText('Periodo'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Días del periodo'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();

    const today = todayDateOnly();
    const [subscription] = await listSubscriptions(context);
    expect(subscription).toMatchObject({
      billing_period: 'custom',
      custom_days: 15,
      paid_until_date: addBillingPeriod(today, 'custom', 15),
    });
  });

  it('requires the custom days before saving a custom period', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.change(await screen.findByLabelText('Periodo'), { target: { value: 'custom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ingresa un número de días de al menos 1.')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toEqual([]);
  });

  it('shows a not-found message for unknown subscribers', async () => {
    await renderNewSubscriptionPage('missing-subscriber');

    expect(await screen.findByText('Suscriptor no encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a suscriptores' })).toBeInTheDocument();
  });
});
