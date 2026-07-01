import { type ReactNode, useEffect, useMemo } from 'react';

import { getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase';

import { demoOrganizationId } from '@/lib/data/data-layer-context';
import {
  attachReplicationStatus,
  createSupabaseReplications,
  createSyncStatusStore,
} from './supabase-sync';
import { SyncStatusContext } from './sync-context';

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createSyncStatusStore(), []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function startSync() {
      if (!hasSupabaseConfig()) {
        return;
      }

      const db = await getMonsterlyDatabase();
      const replications = createSupabaseReplications({
        activeOrganizationId: demoOrganizationId,
        client: getSupabaseClient(),
        db,
      });
      const status = attachReplicationStatus(replications, store);
      cleanup = status.cancel;
    }

    void startSync();

    return () => {
      cleanup?.();
    };
  }, [store]);

  return <SyncStatusContext.Provider value={store}>{children}</SyncStatusContext.Provider>;
}
