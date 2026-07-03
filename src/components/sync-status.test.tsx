import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createSyncStatusStore } from '@/lib/sync/supabase-sync';
import { SyncStatusContext } from '@/lib/sync/sync-context';
import type { SyncStatusSnapshot } from '@/lib/sync/types';

import { SyncStatus } from './sync-status';

function renderSyncStatus(snapshot: Partial<SyncStatusSnapshot>) {
  return render(
    <SyncStatusContext.Provider value={createSyncStatusStore(snapshot)}>
      <SyncStatus />
    </SyncStatusContext.Provider>,
  );
}

describe('SyncStatus', () => {
  it.each([
    ['idle', 'Synced'],
    ['syncing', 'Syncing'],
    ['offline', 'Offline'],
    ['local', 'Local only'],
    ['error', 'Sync error'],
  ] as const)('renders the %s phase as %s', (phase, label) => {
    renderSyncStatus({ phase });

    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('surfaces the failure message on the error badge', () => {
    renderSyncStatus({ error: 'RLS rejected organization', phase: 'error' });

    expect(screen.getByText('Sync error')).toHaveAttribute('title', 'RLS rejected organization');
  });
});
