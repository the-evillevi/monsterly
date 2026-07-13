import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeMonsterlyDatabase, getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import {
  attachConnectivityStatus,
  attachReplicationStatus,
  createSupabaseReplications,
  createSyncStatusStore,
} from './supabase-sync';
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

    expect(replications).toHaveLength(5);
    expect(calls.map((call) => call.tableName)).toEqual([
      'plans',
      'subscribers',
      'subscriptions',
      'renewals',
      'check_ins',
    ]);
    expect(calls.every((call) => call.pull && call.push)).toBe(true);
    expect(calls.every((call) => call.replicationIdentifier.includes('organization-1'))).toBe(true);
    expect(calls.every((call) => call.deletedField === '_deleted')).toBe(true);
    expect(calls.every((call) => call.modifiedField === '_modified')).toBe(true);
  });

  it('attaches push conflict recovery to the subscribers replication only', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });
    const errorSubscriptions: Record<string, ReturnType<typeof vi.fn>> = {};

    const replications = createSupabaseReplications({
      activeOrganizationId: 'organization-1',
      client: createSupabaseClientStub(),
      db,
      replicationFactory: (options) => {
        const unsubscribe = vi.fn();
        errorSubscriptions[options.tableName] = unsubscribe;

        return {
          ...createReplicationStateStub(),
          error$: { subscribe: vi.fn(() => ({ unsubscribe })) },
        };
      },
    });

    // Only subscribers carry the globally unique slug/check_in_code columns,
    // so only that replication gets the recovery listener — and cancelling
    // the replication detaches it.
    replications.forEach((replication) => replication.cancel());

    expect(errorSubscriptions.subscribers).toHaveBeenCalledTimes(1);
    expect(errorSubscriptions.plans).not.toHaveBeenCalled();
    expect(errorSubscriptions.subscriptions).not.toHaveBeenCalled();
    expect(errorSubscriptions.renewals).not.toHaveBeenCalled();
    expect(errorSubscriptions.check_ins).not.toHaveBeenCalled();
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

    store.setOnline();
    store.setSyncing();
    expect(store.getSnapshot()).toMatchObject({ isOnline: true, phase: 'syncing' });

    store.setError(new Error('RLS rejected organization'));
    expect(store.getSnapshot()).toMatchObject({
      error: 'RLS rejected organization',
      phase: 'error',
    });
  });

  it('keeps the offline phase while disconnected regardless of sync events', () => {
    const store = createSyncStatusStore();

    store.setOffline();

    store.setSyncing();
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });

    store.setIdle();
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });

    store.setError(new Error('fetch failed'));
    expect(store.getSnapshot()).toMatchObject({ error: null, isOnline: false, phase: 'offline' });

    store.setLocal();
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });
  });

  it('skips listener notifications when the snapshot does not change', () => {
    const store = createSyncStatusStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setSyncing();
    store.setSyncing();
    store.setSyncing();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('honors an initial offline snapshot', () => {
    const store = createSyncStatusStore({ isOnline: false, phase: 'offline' });

    expect(store.getSnapshot()).toMatchObject({ error: null, isOnline: false, phase: 'offline' });
  });

  it('tracks local-only mode and resumes it after reconnecting', () => {
    const store = createSyncStatusStore();

    store.setLocal();
    expect(store.getSnapshot()).toMatchObject({ error: null, isOnline: true, phase: 'local' });

    store.setOffline();
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });

    store.setOnline();
    store.setLocal();
    expect(store.getSnapshot()).toMatchObject({ isOnline: true, phase: 'local' });
  });

  it('surfaces realtime channel failures as sync errors and recovers', () => {
    const replications = [createReplicationStateStub()];
    let channelStatus: ((status: string) => void) | undefined;
    const removeChannel = vi.fn();
    const channelStub = {
      subscribe: (callback: (status: string) => void) => {
        channelStatus = callback;
        return channelStub;
      },
    };
    const client = { channel: vi.fn(() => channelStub), removeChannel } as never;
    const status = attachReplicationStatus(replications, createSyncStatusStore(), client);

    channelStatus?.('SUBSCRIBED');
    expect(status.store.getSnapshot()).toMatchObject({ error: null, phase: 'idle' });
    expect(replications[0]?.reSync).not.toHaveBeenCalled();

    channelStatus?.('CHANNEL_ERROR');
    expect(status.store.getSnapshot()).toMatchObject({
      error: 'Lost connection to the sync server.',
      phase: 'error',
    });

    channelStatus?.('SUBSCRIBED');
    expect(status.store.getSnapshot()).toMatchObject({ error: null, phase: 'syncing' });
    expect(replications[0]?.reSync).toHaveBeenCalledTimes(1);

    status.cancel();
    expect(removeChannel).toHaveBeenCalledTimes(1);

    channelStatus?.('CHANNEL_ERROR');
    expect(status.store.getSnapshot()).toMatchObject({ error: null, phase: 'syncing' });
  });

  it('resyncs live replications when connectivity returns instead of restarting them', () => {
    const replications = [createReplicationStateStub(), createReplicationStateStub()];
    const status = attachReplicationStatus(replications, createSyncStatusStore());

    window.dispatchEvent(new Event('online'));

    for (const replication of replications) {
      expect(replication.reSync).toHaveBeenCalledTimes(1);
    }
    expect(status.store.getSnapshot()).toMatchObject({ isOnline: true, phase: 'syncing' });

    status.cancel();
  });

  it('reacts to window connectivity events', () => {
    const store = createSyncStatusStore();
    const onOnline = vi.fn(() => store.setLocal());
    const connectivity = attachConnectivityStatus(store, { onOnline });

    window.dispatchEvent(new Event('offline'));
    expect(store.getSnapshot()).toMatchObject({ isOnline: false, phase: 'offline' });

    window.dispatchEvent(new Event('online'));
    expect(onOnline).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ isOnline: true, phase: 'local' });

    connectivity.cancel();
    window.dispatchEvent(new Event('offline'));
    expect(store.getSnapshot()).toMatchObject({ phase: 'local' });
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
    reSync: vi.fn(),
  };
}

function createQueryBuilderStub() {
  return {
    eq: vi.fn(() => createQueryBuilderStub()),
  };
}
