import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataLayerProvider } from './data-layer-provider';

// A database open that never resolves reproduces the blocked storage-upgrade
// hang (another tab holding the previous schema version's IndexedDB open).
vi.mock('@/lib/local-db/monsterly-db', () => ({
  getMonsterlyDatabase: vi.fn(() => new Promise(() => undefined)),
}));

// Node's experimental localStorage shim leaves window.localStorage undefined
// under jsdom, so tests provide a real one.
function createStorageStub(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('DataLayerProvider blocked-open recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageStub(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the recovery banner when the database open times out', () => {
    render(
      <DataLayerProvider>
        <p>app-content</p>
      </DataLayerProvider>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Otra pestaña o ventana de MythOS puede estar bloqueando la actualización',
    );
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    // First failure: reload is the only offer, the destructive reset stays hidden.
    expect(
      screen.queryByRole('button', { name: 'Restablecer datos locales' }),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem('monsterly-db-open-attempts')).toBe('1');
    // The app keeps rendering underneath.
    expect(screen.getByText('app-content')).toBeInTheDocument();
  });

  it('offers the local reset with confirmation after repeated failed opens', () => {
    window.localStorage.setItem('monsterly-db-open-attempts', '1');

    render(
      <DataLayerProvider>
        <p>app-content</p>
      </DataLayerProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    const resetButton = screen.getByRole('button', { name: 'Restablecer datos locales' });

    act(() => {
      resetButton.click();
    });

    expect(
      screen.getByText('¿Borrar los datos locales? Se volverán a descargar del servidor.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });
});
