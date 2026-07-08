import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import { listSubscriptions } from '@/lib/data/subscriptions.queries';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { EditSubscriptionPage } from './edit-subscription-page';

async function renderEditSubscriptionPage(subscriptionId: string) {
  const context = await createTestDataContext();

  render(
    <DataLayerContext.Provider value={context}>
      <MemoryRouter
        initialEntries={[`/subscribers/subscriber-1/subscriptions/${subscriptionId}/edit`]}
      >
        <Routes>
          <Route path="/subscribers/:id/edit" element={<p>edit-subscriber</p>} />
          <Route
            path="/subscribers/:id/subscriptions/:subscriptionId/edit"
            element={<EditSubscriptionPage />}
          />
        </Routes>
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );

  return context;
}

async function seedSubscription(context: Awaited<ReturnType<typeof createTestDataContext>>) {
  await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
  await saveSubscription(context, {
    billing_period: 'weekly',
    id: 'subscription-1',
    kind: 'crossfit',
    paid_until_date: '2026-07-11',
    start_date: '2026-07-04',
    subscriber_id: 'subscriber-1',
  });
}

describe('EditSubscriptionPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('prefills the form with the stored subscription', async () => {
    const context = await createTestDataContext();
    await seedSubscription(context);

    await renderEditSubscriptionPage('subscription-1');

    expect(await screen.findByLabelText('Tipo')).toHaveValue('crossfit');
    expect(screen.getByLabelText('Periodo')).toHaveValue('weekly');
    expect(screen.queryByText('Selecciona una fecha')).not.toBeInTheDocument();
  });

  it('persists type and billing period changes', async () => {
    const context = await createTestDataContext();
    await seedSubscription(context);

    await renderEditSubscriptionPage('subscription-1');

    fireEvent.change(await screen.findByLabelText('Tipo'), { target: { value: 'gym' } });
    fireEvent.change(screen.getByLabelText('Periodo'), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      {
        billing_period: 'monthly',
        id: 'subscription-1',
        kind: 'gym',
        // Dates stay untouched unless the user changes them explicitly.
        paid_until_date: '2026-07-11',
        start_date: '2026-07-04',
      },
    ]);
  });

  it('stores the day count when switching to a custom period', async () => {
    const context = await createTestDataContext();
    await seedSubscription(context);

    await renderEditSubscriptionPage('subscription-1');

    fireEvent.change(await screen.findByLabelText('Periodo'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Días del periodo'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { billing_period: 'custom', custom_days: 20 },
    ]);
  });

  it('archives the subscription after an explicit confirmation', async () => {
    const context = await createTestDataContext();
    await seedSubscription(context);

    await renderEditSubscriptionPage('subscription-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar suscripción' }));
    expect(screen.getByText('¿Archivar esta suscripción?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toEqual([]);
  });

  it('keeps the subscription when the archive confirmation is cancelled', async () => {
    const context = await createTestDataContext();
    await seedSubscription(context);

    await renderEditSubscriptionPage('subscription-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar suscripción' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Archivar suscripción' })).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toMatchObject([{ id: 'subscription-1' }]);
  });

  it('shows a not-found message for unknown subscriptions', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderEditSubscriptionPage('missing-subscription');

    expect(await screen.findByText('Suscripción no encontrada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al suscriptor' })).toBeInTheDocument();
  });
});
