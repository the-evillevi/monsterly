import { type ReactNode, useContext, useEffect, useMemo } from 'react';

import { DataLayerContext, isDemoOrganizationId } from '@/lib/data/data-layer-context';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';

import {
  attachConnectivityStatus,
  attachReplicationStatus,
  createSupabaseReplications,
  createSyncStatusStore,
} from './supabase-sync';
import { SyncStatusContext } from './sync-context';

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useMemo(
    () =>
      createSyncStatusStore({
        isOnline: navigator.onLine,
        phase: navigator.onLine ? 'idle' : 'offline',
      }),
    [],
  );
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  useEffect(() => {
    if (!db || !hasSupabaseConfig() || isDemoOrganizationId(activeOrganizationId)) {
      if (store.getSnapshot().isOnline) {
        store.setLocal();
      }

      const connectivity = attachConnectivityStatus(store, {
        onOnline: () => store.setLocal(),
      });

      return () => {
        connectivity.cancel();
      };
    }

    const replications = createSupabaseReplications({
      activeOrganizationId,
      client: getSupabaseClient(),
      db,
    });
    const status = attachReplicationStatus(replications, store);

    return () => {
      status.cancel();
    };
  }, [activeOrganizationId, db, store]);

  return <SyncStatusContext.Provider value={store}>{children}</SyncStatusContext.Provider>;
}
