import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { listCheckIns } from '@/lib/data/check-ins.queries';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import type { DataModuleContext } from '@/lib/data/data-layer-context';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { CheckInTerminal } from './check-in-terminal';

async function setupMember(
  context: DataModuleContext,
  { id, name, paidUntil }: { id: string; name: string; paidUntil: string },
) {
  const subscriber = await saveSubscriber(context, { id, name });
  await saveSubscription(context, {
    billing_period: 'monthly',
    id: `${id}-subscription`,
    kind: 'gym',
    paid_until_date: paidUntil,
    start_date: '2026-01-01',
    subscriber_id: id,
  });

  return subscriber;
}

function renderTerminal(context: DataModuleContext) {
  render(
    <DataLayerContext.Provider value={context}>
      <CheckInTerminal />
    </DataLayerContext.Provider>,
  );
}

async function scan(code: string) {
  fireEvent.change(screen.getByLabelText('Código de acceso'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
}

describe('CheckInTerminal', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('records a scan for an active member and shows a success card', async () => {
    const context = await createTestDataContext();
    const subscriber = await setupMember(context, {
      id: 'member-1',
      name: 'Ana Torres',
      paidUntil: '2999-12-31',
    });

    renderTerminal(context);
    await scan(subscriber.check_in_code!);

    expect(await screen.findByText('Acceso registrado')).toBeInTheDocument();
    // Name shows in the result card and again in the live "today" list.
    expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0);
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });

  it('blocks an expired member with a high-contrast warning', async () => {
    const context = await createTestDataContext();
    const subscriber = await setupMember(context, {
      id: 'member-2',
      name: 'Luis Vega',
      paidUntil: '2000-01-01',
    });

    renderTerminal(context);
    await scan(subscriber.check_in_code!);

    expect(await screen.findByText('Membresía vencida')).toBeInTheDocument();
    // A vencido scan is still recorded — attendance is truth.
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });

  it('reports an unknown code without recording anything', async () => {
    const context = await createTestDataContext();
    await setupMember(context, { id: 'member-3', name: 'Ana Torres', paidUntil: '2999-12-31' });

    renderTerminal(context);
    await scan('000000');

    expect(await screen.findByText('Código no reconocido')).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(0);
  });

  it('folds a rapid rescan into the existing visit', async () => {
    const context = await createTestDataContext();
    const subscriber = await setupMember(context, {
      id: 'member-4',
      name: 'Ana Torres',
      paidUntil: '2999-12-31',
    });

    renderTerminal(context);
    await scan(subscriber.check_in_code!);
    await screen.findByText('Acceso registrado');

    await scan(subscriber.check_in_code!);

    expect(await screen.findByText(/Ya registrado/)).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });
});
