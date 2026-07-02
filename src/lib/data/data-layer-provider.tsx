import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { getMonsterlyDatabase, type MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import {
  DataLayerContext,
  getLocalDatabaseName,
  resolveActiveOrganizationId,
} from './data-layer-context';
import { seedDemoSubscribers } from './seed-demo-subscribers';

export function DataLayerProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<MonsterlyDatabase | null>(null);
  const activeOrganizationId = useMemo(() => resolveActiveOrganizationId(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadDatabase() {
      const nextDb = await getMonsterlyDatabase({
        name: getLocalDatabaseName(activeOrganizationId),
      });

      await seedDemoSubscribers({
        activeOrganizationId,
        db: nextDb,
      });

      if (isMounted) {
        setDb(nextDb);
      }
    }

    void loadDatabase();

    return () => {
      isMounted = false;
    };
  }, [activeOrganizationId]);

  const value = useMemo(
    () => ({
      activeOrganizationId,
      db,
    }),
    [activeOrganizationId, db],
  );

  return <DataLayerContext.Provider value={value}>{children}</DataLayerContext.Provider>;
}
