import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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

async function seedPlans(context: Awaited<ReturnType<typeof createTestDataContext>>) {
  const now = new Date().toISOString();
  const base = {
    _deleted: false,
    _modified: now,
    active: true,
    created_at: now,
    organization_id: context.activeOrganizationId,
    updated_at: now,
    weekly_visit_limit: null,
  };

  await Promise.all([
    context.db.plans.insert({
      ...base,
      facility_access: ['dragonz'],
      id: 'plan-gimnasio',
      name: 'Gimnasio',
      price: 300,
    }),
    context.db.plans.insert({
      ...base,
      facility_access: ['dragonz', 'monsters'],
      id: 'plan-combo',
      name: 'Combo',
      price: 600,
    }),
  ]);
}

describe('NewSubscriptionPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('saves a plan subscription with the snapshot and suggested monthly dates', async () => {
    const context = await createTestDataContext();
    await seedPlans(context);
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.change(await screen.findByLabelText('Plan'), { target: { value: 'plan-combo' } });
    expect(screen.getByText('Acceso: Gym + CrossFit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();

    const today = todayDateOnly();
    const [subscription] = await listSubscriptions(context);
    expect(subscription).toMatchObject({
      billing_period: 'monthly',
      kind: 'crossfit',
      paid_until_date: addBillingPeriod(today, 'monthly'),
      plan_id: 'plan-combo',
      plan_name: 'Combo',
      price: 600,
      start_date: today,
      subscriber_id: 'subscriber-1',
    });
  });

  it('derives the deprecated gym kind for Dragonz-only plans', async () => {
    const context = await createTestDataContext();
    await seedPlans(context);
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.change(await screen.findByLabelText('Plan'), { target: { value: 'plan-gimnasio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('edit-subscriber')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { kind: 'gym', plan_name: 'Gimnasio', price: 300 },
    ]);
  });

  it('requires choosing a plan before saving', async () => {
    const context = await createTestDataContext();
    await seedPlans(context);
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Selecciona un plan.')).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toEqual([]);
  });

  it('offers only active catalog plans', async () => {
    const context = await createTestDataContext();
    await seedPlans(context);
    const now = new Date().toISOString();
    await context.db.plans.insert({
      _deleted: false,
      _modified: now,
      active: false,
      created_at: now,
      facility_access: ['monsters'],
      id: 'plan-programacion',
      name: 'Programación',
      organization_id: context.activeOrganizationId,
      price: 500,
      updated_at: now,
      weekly_visit_limit: null,
    });
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    await screen.findByLabelText('Plan');
    expect(screen.getByRole('option', { name: 'Combo — $600' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Programación/ })).not.toBeInTheDocument();
  });

  it('explains when the organization has no plans configured', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderNewSubscriptionPage('subscriber-1');

    expect(
      await screen.findByText('No hay planes configurados para esta organización.'),
    ).toBeInTheDocument();
  });

  it('shows a not-found message for unknown subscribers', async () => {
    const context = await createTestDataContext();
    await seedPlans(context);

    await renderNewSubscriptionPage('missing-subscriber');

    expect(await screen.findByText('Suscriptor no encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a suscriptores' })).toBeInTheDocument();
  });
});
