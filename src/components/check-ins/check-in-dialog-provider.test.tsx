import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLocation, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCheckInDialog } from '@/components/check-ins/check-in-dialog-context';
import { LegacyCheckInRedirect } from '@/components/check-ins/legacy-check-in-redirect';
import { Button } from '@/components/ui/button';
import { DataLayerContext } from '@/lib/data/data-layer-context';
import { listCheckIns } from '@/lib/data/check-ins.queries';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { saveSubscription } from '@/lib/data/subscriptions.commands';
import type { DataModuleContext } from '@/lib/data/data-layer-context';
import { formatDateOnly } from '@/lib/domain/date-only';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { CheckInDialogProvider } from './check-in-dialog-provider';

function DialogHarness({ subscriberId }: { subscriberId?: string }) {
  const { openSearch, recordSubscriber } = useCheckInDialog();

  return (
    <>
      <Button onClick={openSearch}>Abrir check-in</Button>
      {subscriberId ? (
        <Button onClick={() => void recordSubscriber(subscriberId)}>Check-in directo</Button>
      ) : null}
    </>
  );
}

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderProvider(context: DataModuleContext, children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <DataLayerContext.Provider value={context}>
        <CheckInDialogProvider>{children}</CheckInDialogProvider>
      </DataLayerContext.Provider>
    </MemoryRouter>,
  );
}

async function seedMember(
  context: DataModuleContext,
  overrides: { name?: string; paidUntil?: string; phone_number?: string } = {},
) {
  const subscriber = await saveSubscriber(context, {
    id: 'member-1',
    name: overrides.name ?? 'José Ramírez',
    phone_number: overrides.phone_number ?? '+52 55 1122 3344',
  });
  await saveSubscription(context, {
    billing_period: 'monthly',
    id: 'subscription-1',
    kind: 'gym',
    paid_until_date: overrides.paidUntil ?? '2999-12-31',
    start_date: '2026-01-01',
    subscriber_id: subscriber.id,
  });

  return subscriber;
}

describe('CheckInDialogProvider', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestDatabase();
  });

  it('records an exact PIN submitted through the scanner form and restores focus', async () => {
    const context = await createTestDataContext();
    const subscriber = await seedMember(context);
    renderProvider(context, <DialogHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir check-in' }));
    const input = await screen.findByLabelText('Miembro');
    fireEvent.change(input, { target: { value: subscriber.check_in_code } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Acceso registrado')).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('fuzzy-finds members by name and phone and records the selected result', async () => {
    const context = await createTestDataContext();
    await seedMember(context);
    renderProvider(context, <DialogHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir check-in' }));
    const input = await screen.findByLabelText('Miembro');
    fireEvent.change(input, { target: { value: 'jose' } });
    fireEvent.click(await screen.findByRole('button', { name: /José Ramírez/ }));

    expect(await screen.findByText('Acceso registrado')).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(1);

    fireEvent.change(input, { target: { value: '11223344' } });
    expect(await screen.findByRole('button', { name: /José Ramírez/ })).toBeInTheDocument();
  });

  it('keeps unknown members separate from operational write failures', async () => {
    const context = await createTestDataContext();
    const subscriber = await seedMember(context);
    renderProvider(context, <DialogHarness subscriberId={subscriber.id} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir check-in' }));
    const input = await screen.findByLabelText('Miembro');
    fireEvent.change(input, { target: { value: '000000' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('Miembro no encontrado')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);

    vi.spyOn(context.db.check_ins, 'insert').mockRejectedValueOnce(new Error('write failed'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Check-in directo' }));

    expect(await screen.findByText('No se pudo registrar la entrada')).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(0);
  });

  it('shows duplicate feedback and inline renewal for a member who is about to expire', async () => {
    const context = await createTestDataContext();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const subscriber = await seedMember(context, { paidUntil: formatDateOnly(tomorrow) });
    renderProvider(context, <DialogHarness subscriberId={subscriber.id} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check-in directo' }));
    expect(await screen.findByText('Por vencer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renovar' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Check-in directo' }));
    expect(await screen.findByText(/Ya registrado/)).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });

  it('blocks expired members without writing a check-in and offers renewal', async () => {
    const context = await createTestDataContext();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const subscriber = await seedMember(context, { paidUntil: formatDateOnly(yesterday) });
    renderProvider(context, <DialogHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir check-in' }));
    const input = await screen.findByLabelText('Miembro');
    fireEvent.change(input, { target: { value: subscriber.check_in_code } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Entrada bloqueada')).toBeInTheDocument();
    expect(screen.getByText(/Renueva antes de registrar la entrada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renovar' })).toBeInTheDocument();
    await expect(listCheckIns(context)).resolves.toHaveLength(0);
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('redirects the legacy route to the dashboard and opens the dialog', async () => {
    const context = await createTestDataContext();
    render(
      <MemoryRouter initialEntries={['/check-in']}>
        <DataLayerContext.Provider value={context}>
          <CheckInDialogProvider>
            <LocationProbe />
            <Routes>
              <Route path="/check-in" element={<LegacyCheckInRedirect />} />
              <Route path="/dashboard" element={<p>Dashboard</p>} />
            </Routes>
          </CheckInDialogProvider>
        </DataLayerContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Registrar entrada' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
});
