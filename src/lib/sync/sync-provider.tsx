import { type ReactNode, useContext, useEffect, useMemo } from 'react';

import { useAuth } from '@/lib/auth/use-auth';
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
  const auth = useAuth();

  useEffect(() => {
    // Replication needs an authenticated JWT in prod: hold in local mode until
    // auth is settled — `disabled` (demo / anon local dev) or a confirmed
    // `member`. A signed-out or denied session stays local (no anon reads/writes
    // in prod), and signing in re-runs this effect so the JWT-scoped
    // replications start automatically.
    const authReady = auth.status === 'disabled' || auth.status === 'member';

    if (!authReady || !db || !hasSupabaseConfig() || isDemoOrganizationId(activeOrganizationId)) {
      store.setLocal();

      const connectivity = attachConnectivityStatus(store, {
        onOnline: () => store.setLocal(),
      });

      return () => {
        connectivity.cancel();
      };
    }

    const client = getSupabaseClient();
    const replications = createSupabaseReplications({
      activeOrganizationId,
      client,
      db,
    });
    const status = attachReplicationStatus(replications, store, client);

    return () => {
      status.cancel();
    };
  }, [activeOrganizationId, auth.status, db, store]);

  return <SyncStatusContext.Provider value={store}>{children}</SyncStatusContext.Provider>;
}
