import type { SupabaseClient } from '@supabase/supabase-js';

import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error' | 'local';

export type SyncStatusSnapshot = {
  error: string | null;
  isOnline: boolean;
  phase: SyncPhase;
};

type SyncSubscription = {
  unsubscribe: () => void;
};

type SyncObservable<Value> = {
  subscribe: (listener: (value: Value) => void) => SyncSubscription;
};

export type SyncReplicationState = {
  active$: SyncObservable<boolean>;
  cancel: () => unknown;
  error$: SyncObservable<unknown>;
  reSync?: () => void;
};

export type SyncReplicationFactoryCall = {
  client: SupabaseClient;
  collection: MonsterlyDatabase['renewals' | 'subscribers' | 'subscriptions'];
  deletedField: '_deleted';
  live: boolean;
  modifiedField: '_modified';
  pull: {
    batchSize: number;
    queryBuilder: (params: {
      batchSize: number;
      lastPulledCheckpoint: unknown;
      query: { eq: (column: string, value: string) => unknown };
    }) => unknown;
  };
  push: {
    batchSize: number;
  };
  replicationIdentifier: string;
  retryTime: number;
  tableName: 'renewals' | 'subscribers' | 'subscriptions';
  waitForLeadership: boolean;
};

export type SyncReplicationFactory = (options: SyncReplicationFactoryCall) => SyncReplicationState;
