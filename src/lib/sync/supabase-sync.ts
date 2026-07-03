import type { SupabaseClient } from '@supabase/supabase-js';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import type { SyncReplicationFactory, SyncReplicationState, SyncStatusSnapshot } from './types';

type CreateSupabaseReplicationsOptions = {
  activeOrganizationId: string;
  client: SupabaseClient;
  db: MonsterlyDatabase;
  replicationFactory?: SyncReplicationFactory;
};

type CollectionSyncConfig = {
  collectionName: 'renewals' | 'subscribers' | 'subscriptions';
  tableName: 'renewals' | 'subscribers' | 'subscriptions';
};

const collectionSyncConfigs: CollectionSyncConfig[] = [
  { collectionName: 'subscribers', tableName: 'subscribers' },
  { collectionName: 'subscriptions', tableName: 'subscriptions' },
  { collectionName: 'renewals', tableName: 'renewals' },
];

export function createSupabaseReplications({
  activeOrganizationId,
  client,
  db,
  replicationFactory = replicateSupabase as unknown as SyncReplicationFactory,
}: CreateSupabaseReplicationsOptions) {
  return collectionSyncConfigs.map(({ collectionName, tableName }) =>
    replicationFactory({
      client,
      collection: db[collectionName],
      deletedField: '_deleted',
      live: true,
      modifiedField: '_modified',
      pull: {
        batchSize: 50,
        queryBuilder: ({ query }) => query.eq('organization_id', activeOrganizationId),
      },
      push: {
        batchSize: 50,
      },
      replicationIdentifier: `monsterly-${activeOrganizationId}-${tableName}`,
      retryTime: 5_000,
      tableName,
      waitForLeadership: false,
    }),
  );
}

export function createSyncStatusStore(initialSnapshot?: Partial<SyncStatusSnapshot>) {
  let snapshot: SyncStatusSnapshot = {
    error: null,
    isOnline: true,
    phase: 'idle',
    ...initialSnapshot,
  };
  const listeners = new Set<() => void>();

  function emit(nextSnapshot: SyncStatusSnapshot) {
    if (
      nextSnapshot.error === snapshot.error &&
      nextSnapshot.isOnline === snapshot.isOnline &&
      nextSnapshot.phase === snapshot.phase
    ) {
      return;
    }

    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  }

  // Offline wins: while isOnline is false the snapshot stays offline-shaped.
  // Phase transitions resume after setOnline (driven by connectivity events).
  return {
    getSnapshot: () => snapshot,
    setError: (error: unknown) => {
      if (!snapshot.isOnline) {
        return;
      }

      emit({
        error: error instanceof Error ? error.message : 'Sync failed',
        isOnline: snapshot.isOnline,
        phase: 'error',
      });
    },
    setIdle: () => {
      if (!snapshot.isOnline) {
        return;
      }

      emit({
        error: null,
        isOnline: snapshot.isOnline,
        phase: 'idle',
      });
    },
    setLocal: () => {
      if (!snapshot.isOnline) {
        return;
      }

      emit({
        error: null,
        isOnline: snapshot.isOnline,
        phase: 'local',
      });
    },
    setOffline: () => {
      emit({
        error: null,
        isOnline: false,
        phase: 'offline',
      });
    },
    setOnline: () => {
      emit({
        ...snapshot,
        isOnline: true,
      });
    },
    setSyncing: () => {
      if (!snapshot.isOnline) {
        return;
      }

      emit({
        error: null,
        isOnline: snapshot.isOnline,
        phase: 'syncing',
      });
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type SyncStatusStore = ReturnType<typeof createSyncStatusStore>;

export function attachConnectivityStatus(
  store: SyncStatusStore,
  { onOnline }: { onOnline: () => void },
) {
  function handleOffline() {
    store.setOffline();
  }

  function handleOnline() {
    store.setOnline();
    onOnline();
  }

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  return {
    cancel: () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    },
  };
}

export function attachReplicationStatus(
  replications: SyncReplicationState[],
  store = createSyncStatusStore({
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  }),
) {
  const subscriptions = replications.flatMap((replication) => [
    replication.active$.subscribe((isActive: boolean) => {
      if (isActive) {
        store.setSyncing();
      } else {
        store.setIdle();
      }
    }),
    replication.error$.subscribe((error: unknown) => {
      store.setError(error);
    }),
  ]);

  const connectivity = attachConnectivityStatus(store, {
    onOnline: () => {
      store.setSyncing();
      replications.forEach((replication) => {
        void replication.start?.();
      });
    },
  });

  return {
    cancel: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      connectivity.cancel();
      replications.forEach((replication) => {
        void replication.cancel();
      });
    },
    store,
  };
}
