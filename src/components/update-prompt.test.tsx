import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createAppUpdateManager } from '@/pwa/app-update';

import { UpdatePrompt } from './update-prompt';

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

function createManagerStub() {
  const updateServiceWorker = vi.fn(() => Promise.resolve());
  let onNeedRefresh: (() => void) | undefined;

  const manager = createAppUpdateManager(((options: { onNeedRefresh?: () => void }) => {
    onNeedRefresh = options.onNeedRefresh;

    return updateServiceWorker;
  }) as never);

  manager.start();

  return {
    manager,
    signalUpdateReady: () => onNeedRefresh?.(),
    updateServiceWorker,
  };
}

describe('UpdatePrompt', () => {
  it('renders nothing until an update is ready', () => {
    const { manager } = createManagerStub();

    render(<UpdatePrompt manager={manager} />);

    expect(screen.queryByText('Nueva versión disponible.')).not.toBeInTheDocument();
  });

  it('shows the prompt and applies the update on Actualizar', () => {
    const { manager, signalUpdateReady, updateServiceWorker } = createManagerStub();

    render(<UpdatePrompt manager={manager} />);

    act(() => {
      signalUpdateReady();
    });

    expect(screen.getByText('Nueva versión disponible.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
