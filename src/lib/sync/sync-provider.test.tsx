import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataLayerContext, demoOrganizationId } from '@/lib/data/data-layer-context';
import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import { createSupabaseReplications } from './supabase-sync';
import { SyncProvider } from './sync-provider';

vi.mock('./supabase-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabase-sync')>();

  return {
    ...actual,
    createSupabaseReplications: vi.fn(() => []),
  };
});

vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase')>();

  return {
    ...actual,
    getSupabaseClient: vi.fn(() => ({})),
  };
});

const organizationUuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function renderSyncProvider(activeOrganizationId: string) {
  return render(
    <DataLayerContext.Provider value={{ activeOrganizationId, db: {} as MonsterlyDatabase }}>
      <SyncProvider>
        <span>content</span>
      </SyncProvider>
    </DataLayerContext.Provider>,
  );
}

function stubSupabaseEnv() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  vi.stubEnv('VITE_MONSTERLY_ORGANIZATION_ID', organizationUuid);
}

describe('SyncProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('does not start replication without Supabase configuration', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_MONSTERLY_ORGANIZATION_ID', '');

    renderSyncProvider(organizationUuid);

    expect(createSupabaseReplications).not.toHaveBeenCalled();
  });

  it('does not start replication for the demo organization', () => {
    stubSupabaseEnv();

    renderSyncProvider(demoOrganizationId);

    expect(createSupabaseReplications).not.toHaveBeenCalled();
  });

  it('starts replication for the configured organization uuid', () => {
    stubSupabaseEnv();

    renderSyncProvider(organizationUuid);

    expect(createSupabaseReplications).toHaveBeenCalledTimes(1);
    expect(createSupabaseReplications).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrganizationId: organizationUuid }),
    );
  });
});
