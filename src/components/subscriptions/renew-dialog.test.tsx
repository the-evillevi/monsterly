import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import type { DataModuleContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import { listRenewals, listSubscriptions } from '@/lib/data/subscriptions.queries';
import { nextPaidUntilDate } from '@/lib/domain/billing-period';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { RenewDialog } from './renew-dialog';

async function seedSubscription(
  context: DataModuleContext,
  overrides: Partial<Parameters<typeof saveSubscription>[1]> = {},
) {
  return saveSubscription(context, {
    billing_period: 'monthly',
    id: 'subscription-1',
    kind: 'gym',
    paid_until_date: '2026-07-20',
    start_date: '2026-07-01',
    subscriber_id: 'subscriber-1',
    ...overrides,
  });
}

function renderDialog(context: DataModuleContext, subscriptions: SubscriptionDocument[]) {
  render(
    <DataLayerContext.Provider value={context}>
      <RenewDialog subscriptions={subscriptions} />
    </DataLayerContext.Provider>,
  );
}

async function setupSingle() {
  const context = await createTestDataContext();
  await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
  const subscription = await seedSubscription(context);
  renderDialog(context, [subscription]);
  return context;
}

describe('RenewDialog', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('renews with the stored period and default cash method', async () => {
    const context = await setupSingle();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar renovación' }));

    const expected = nextPaidUntilDate('2026-07-20', 'monthly');
    await waitFor(async () => {
      await expect(listSubscriptions(context)).resolves.toMatchObject([
        { id: 'subscription-1', paid_until_date: expected },
      ]);
    });
    await expect(listRenewals(context)).resolves.toMatchObject([
      {
        new_paid_until_date: expected,
        payment_method: 'cash',
        previous_paid_until_date: '2026-07-20',
      },
    ]);
  });

  it('records the chosen payment method', async () => {
    const context = await setupSingle();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Transferencia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar renovación' }));

    await waitFor(async () => {
      await expect(listRenewals(context)).resolves.toMatchObject([{ payment_method: 'transfer' }]);
    });
  });

  it('renews with a one-off custom period', async () => {
    const context = await setupSingle();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.change(screen.getByLabelText('Renovar por'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Días del periodo'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar renovación' }));

    const expected = nextPaidUntilDate('2026-07-20', 'custom', 15);
    await waitFor(async () => {
      await expect(listSubscriptions(context)).resolves.toMatchObject([
        // A custom one-off keeps the stored monthly period.
        { billing_period: 'monthly', paid_until_date: expected },
      ]);
    });
  });

  it('disables confirmation until custom days are valid', async () => {
    await setupSingle();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.change(screen.getByLabelText('Renovar por'), { target: { value: 'custom' } });

    expect(screen.getByRole('button', { name: 'Confirmar renovación' })).toBeDisabled();
    expect(screen.getByText('Ingresa un número de días de al menos 1.')).toBeInTheDocument();
  });

  it('asks which subscription to renew when the member has more than one', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    const gym = await seedSubscription(context, {
      id: 'subscription-1',
      paid_until_date: '2026-07-20',
    });
    const crossfit = await seedSubscription(context, {
      id: 'subscription-2',
      kind: 'crossfit',
      paid_until_date: '2026-08-15',
    });
    renderDialog(context, [gym, crossfit]);

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    // Picker step: one radio per subscription, no billing form yet.
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByLabelText('Renovar por')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Pagado hasta 15 ago 2026'));

    expect(await screen.findByLabelText('Renovar por')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar renovación' }));

    const expected = nextPaidUntilDate('2026-08-15', 'monthly');
    await waitFor(async () => {
      const subscriptions = await listSubscriptions(context);
      expect(
        subscriptions.find((subscription) => subscription.id === 'subscription-2'),
      ).toMatchObject({ paid_until_date: expected });
      // The other subscription is untouched.
      expect(
        subscriptions.find((subscription) => subscription.id === 'subscription-1'),
      ).toMatchObject({ paid_until_date: '2026-07-20' });
    });
  });
});
