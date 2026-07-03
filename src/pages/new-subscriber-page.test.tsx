import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext, type DataLayerContextValue } from '@/lib/data/data-layer-context';
import { listSubscribers } from '@/lib/data/subscribers.queries';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { NewSubscriberPage } from './new-subscriber-page';

function renderPage(value: DataLayerContextValue) {
  render(
    <DataLayerContext.Provider value={value}>
      <MemoryRouter initialEntries={['/subscribers/new']}>
        <Routes>
          <Route path="/subscribers" element={<p>subscribers-list</p>} />
          <Route path="/subscribers/new" element={<NewSubscriberPage />} />
        </Routes>
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );
}

async function renderNewSubscriberPage() {
  const context = await createTestDataContext();
  renderPage(context);

  return context;
}

describe('NewSubscriberPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('requires a name and saves nothing without one', async () => {
    const context = await renderNewSubscriberPage();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    await expect(listSubscribers(context)).resolves.toEqual([]);
  });

  it('saves a subscriber with name, gender, and phone, then navigates to the list', async () => {
    const context = await renderNewSubscriberPage();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Torres' } });
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), {
      target: { value: '+52 55 0000 0001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('subscribers-list')).toBeInTheDocument();
    await expect(listSubscribers(context)).resolves.toMatchObject([
      { gender: 'female', name: 'Ana Torres', phone_number: '+52 55 0000 0001' },
    ]);
  });

  it('saves without a phone number when the field is left empty', async () => {
    const context = await renderNewSubscriberPage();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luis Vega' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('subscribers-list')).toBeInTheDocument();

    const [subscriber] = await listSubscribers(context);
    expect(subscriber).toMatchObject({ name: 'Luis Vega' });
    expect(subscriber?.phone_number ?? null).toBeNull();
  });

  it('shows a save error when the database is not ready', async () => {
    renderPage({ activeOrganizationId: 'organization-1', db: null });

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Torres' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('No se pudieron guardar los cambios. Intenta de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });
});
