import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import { listRenewals, listSubscriptions } from '@/lib/data/subscriptions.queries';
import { nextPaidUntilDate } from '@/lib/domain/billing-period';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { RenewSubscriptionControl } from './renew-subscription-control';

async function setupSubscription() {
  const context = await createTestDataContext();
  await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
  const subscription = await saveSubscription(context, {
    billing_period: 'monthly',
    id: 'subscription-1',
    kind: 'gym',
    paid_until_date: '2026-07-20',
    start_date: '2026-07-01',
    subscriber_id: 'subscriber-1',
  });

  render(
    <DataLayerContext.Provider value={context}>
      <RenewSubscriptionControl subscription={subscription} />
    </DataLayerContext.Provider>,
  );

  return context;
}

describe('RenewSubscriptionControl', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('renews with the stored billing period after confirmation', async () => {
    const context = await setupSubscription();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByRole('button', { name: 'Renovar' })).toBeInTheDocument();

    const expected = nextPaidUntilDate('2026-07-20', 'monthly');
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { id: 'subscription-1', paid_until_date: expected },
    ]);
    await expect(listRenewals(context)).resolves.toMatchObject([
      { new_paid_until_date: expected, previous_paid_until_date: '2026-07-20' },
    ]);
  });

  it('renews with a one-off custom period', async () => {
    const context = await setupSubscription();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.change(screen.getByLabelText('Renovar por'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Días del periodo'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByRole('button', { name: 'Renovar' })).toBeInTheDocument();

    const expected = nextPaidUntilDate('2026-07-20', 'custom', 15);
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      // A custom one-off renewal keeps the stored monthly period.
      { billing_period: 'monthly', paid_until_date: expected },
    ]);
  });

  it('disables confirmation until custom days are valid', async () => {
    await setupSubscription();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.change(screen.getByLabelText('Renovar por'), { target: { value: 'custom' } });

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(screen.getByText('Ingresa un número de días de al menos 1.')).toBeInTheDocument();
  });

  it('keeps the subscription unchanged when cancelled', async () => {
    const context = await setupSubscription();

    fireEvent.click(screen.getByRole('button', { name: 'Renovar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Renovar' })).toBeInTheDocument();
    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { paid_until_date: '2026-07-20' },
    ]);
    await expect(listRenewals(context)).resolves.toEqual([]);
  });
});
