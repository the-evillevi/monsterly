import { type ReactNode, useContext, useEffect, useMemo } from 'react';

import { DataLayerContext, isDemoOrganizationId } from '@/lib/data/data-layer-context';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';

import {
  attachReplicationStatus,
  createSupabaseReplications,
  createSyncStatusStore,
} from './supabase-sync';
import { SyncStatusContext } from './sync-context';

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createSyncStatusStore(), []);
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  useEffect(() => {
    if (!db || !hasSupabaseConfig() || isDemoOrganizationId(activeOrganizationId)) {
      return;
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
