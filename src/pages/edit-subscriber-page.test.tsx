import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { recordDayVisit } from '@/lib/data/day-visits.commands';
import { listSubscribers } from '@/lib/data/subscribers.queries';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { EditSubscriberPage } from './edit-subscriber-page';

async function renderEditPage(subscriberId: string) {
  const context = await createTestDataContext();

  render(
    <DataLayerContext.Provider value={context}>
      <MemoryRouter initialEntries={[`/subscribers/${subscriberId}/edit`]}>
        <Routes>
          <Route path="/subscribers" element={<p>subscribers-list</p>} />
          <Route path="/subscribers/:slug/edit" element={<EditSubscriberPage />} />
        </Routes>
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );

  return context;
}

describe('EditSubscriberPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('prefills the form with the stored subscriber', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, {
      gender: 'female',
      id: 'subscriber-1',
      name: 'Ana Torres',
      phone_number: '+52 55 0000 0001',
    });

    await renderEditPage('subscriber-1');

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana Torres');
    expect(screen.getByLabelText('Género')).toHaveValue('female');
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('+52 55 0000 0001');
  });

  it('persists edits and navigates back to the list', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, {
      id: 'subscriber-1',
      name: 'Ana Torres',
      phone_number: '+52 55 0000 0001',
    });

    await renderEditPage('subscriber-1');

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Ana María Torres' } });
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('subscribers-list')).toBeInTheDocument();

    const [subscriber] = await listSubscribers(context);
    expect(subscriber).toMatchObject({ id: 'subscriber-1', name: 'Ana María Torres' });
    expect(subscriber?.phone_number).toBeNull();
  });

  it('archives the subscriber after an explicit confirmation', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderEditPage('subscriber-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar suscriptor' }));
    expect(screen.getByText('¿Archivar este suscriptor?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('subscribers-list')).toBeInTheDocument();
    await expect(listSubscribers(context)).resolves.toEqual([]);
  });

  it('shows the member-linked day-visit history', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await recordDayVisit(context, {
      now: new Date('2026-07-14T18:00:00.000Z'),
      subscriber_id: 'subscriber-1',
      visit_type: 'both',
    });

    await renderEditPage('subscriber-1');

    expect(await screen.findByText('Visitas de un día')).toBeInTheDocument();
    const visitHistory = await screen.findByRole('list', {
      name: 'Visitas de un día del miembro',
    });
    expect(visitHistory).toHaveTextContent('Ambos');
    expect(visitHistory).toHaveTextContent('$80');
  });

  it('keeps the subscriber when the archive confirmation is cancelled', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await renderEditPage('subscriber-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar suscriptor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Archivar suscriptor' })).toBeInTheDocument();
    await expect(listSubscribers(context)).resolves.toMatchObject([{ id: 'subscriber-1' }]);
  });

  it('shows a not-found message for unknown subscribers', async () => {
    await renderEditPage('missing-subscriber');

    expect(await screen.findByText('Suscriptor no encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a suscriptores' })).toBeInTheDocument();
  });
});
