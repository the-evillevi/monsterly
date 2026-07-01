import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeMonsterlyDatabase, getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import { createSupabaseReplications, createSyncStatusStore } from './supabase-sync';
import type { SyncReplicationFactoryCall } from './types';

describe('Supabase organization sync', () => {
  afterEach(async () => {
    await closeMonsterlyDatabase();
    indexedDB.deleteDatabase('monsterly-test');
  });

  it('starts pull and push replication for organization-scoped collections', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });
    const calls: SyncReplicationFactoryCall[] = [];

    const replications = createSupabaseReplications({
      activeOrganizationId: 'organization-1',
      client: createSupabaseClientStub(),
      db,
      replicationFactory: (options) => {
        calls.push(options);

        return createReplicationStateStub();
      },
    });

    expect(replications).toHaveLength(3);
    expect(calls.map((call) => call.tableName)).toEqual([
      'subscribers',
      'subscriptions',
      'renewals',
    ]);
    expect(calls.every((call) => call.pull && call.push)).toBe(true);
    expect(calls.every((call) => call.replicationIdentifier.includes('organization-1'))).toBe(true);
  });

  it('adds organization filters to pull queries', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });
    const calls: SyncReplicationFactoryCall[] = [];

    createSupabaseReplications({
      activeOrganizationId: 'organization-1',
      client: createSupabaseClientStub(),
      db,
      replicationFactory: (options) => {
        calls.push(options);

        return createReplicationStateStub();
      },
    });

    const query = createQueryBuilderStub();
    calls[0]?.pull.queryBuilder({
      batchSize: 10,
      lastPulledCheckpoint: undefined,
      query,
    });

    expect(query.eq).toHaveBeenCalledWith('organization_id', 'organization-1');
  });

  it('exposes sync status for offline, resumed, and error states', () => {
    const store = createSyncStatusStore();

    expect(store.getSnapshot()).toMatchObject({ error: null, isOnline: true, phase: 'idle' });

    store.setOffline();
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });

    store.setSyncing();
    expect(store.getSnapshot()).toMatchObject({ isOnline: true, phase: 'syncing' });

    store.setError(new Error('RLS rejected organization'));
    expect(store.getSnapshot()).toMatchObject({
      error: 'RLS rejected organization',
      phase: 'error',
    });
  });
});

function createSupabaseClientStub() {
  return {} as never;
}

function createReplicationStateStub() {
  return {
    active$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
    cancel: vi.fn(),
    error$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
    start: vi.fn(),
  };
}

function createQueryBuilderStub() {
  return {
    eq: vi.fn(() => createQueryBuilderStub()),
  };
}
