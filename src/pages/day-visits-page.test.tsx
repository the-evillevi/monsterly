import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DataLayerContext } from '@/lib/data/data-layer-context';
import { recordDayVisit } from '@/lib/data/day-visits.commands';
import { listDayVisits } from '@/lib/data/day-visits.queries';
import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { formatDateOnlyLabel } from '@/lib/domain/date-only';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { DayVisitsPage } from './day-visits-page';

async function renderPage() {
  const context = await createTestDataContext();

  render(
    <DataLayerContext.Provider value={context}>
      <MemoryRouter>
        <DayVisitsPage />
      </MemoryRouter>
    </DataLayerContext.Provider>,
  );

  return context;
}

describe('DayVisitsPage', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('records and undoes an unlinked visit from the quick action', async () => {
    const context = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Gimnasio $40' }));

    expect(await screen.findByText('de 1 visita')).toBeInTheDocument();
    await expect(listDayVisits(context)).resolves.toMatchObject([
      { price: 40, subscriber_id: null, visit_type: 'gym' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    await waitFor(async () => expect(await listDayVisits(context)).toEqual([]));
    expect(await screen.findByText('de 0 visitas')).toBeInTheDocument();
  });

  it('ignores rapid duplicate taps while a visit is being recorded', async () => {
    const context = await renderPage();
    const button = screen.getByRole('button', { name: 'Ambos $80' });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(await screen.findByText('de 1 visita')).toBeInTheDocument();
    await expect(listDayVisits(context)).resolves.toHaveLength(1);
  });

  it('searches and links a member, then clears the selection after saving', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await renderPage();

    fireEvent.change(screen.getByLabelText('Vincular miembro (opcional)'), {
      target: { value: 'Ana' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Ana Torres/ }));
    fireEvent.click(screen.getByRole('button', { name: 'CrossFit $60' }));

    expect(await screen.findByRole('link', { name: 'Ana Torres' })).toBeInTheDocument();
    expect(screen.getByLabelText('Vincular miembro (opcional)')).toHaveValue('');
    await expect(listDayVisits(context)).resolves.toMatchObject([
      { price: 60, subscriber_id: 'subscriber-1', visit_type: 'crossfit' },
    ]);
  });

  it('shows previous local days and can annul a historical mistake', async () => {
    const context = await createTestDataContext();
    const visitDate = '2026-07-14';
    await recordDayVisit(context, {
      now: new Date(`${visitDate}T18:00:00.000Z`),
      visit_type: 'both',
    });
    await renderPage();

    expect(await screen.findByText(formatDateOnlyLabel(visitDate))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(async () => expect(await listDayVisits(context)).toEqual([]));
    expect(await screen.findByText('Todavía no hay visitas de un día registradas.')).toBeVisible();
  });
});
