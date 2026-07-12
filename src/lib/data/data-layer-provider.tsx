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
    // Opening the database can hang forever with no error: a schema upgrade
    // deletes the previous version's IndexedDB database, and that deletion
    // blocks while any other tab (often one left open from before a deploy)
    // still holds a connection to it.
    const slowOpenWarning = setTimeout(() => {
      console.warn(
        'The local database is taking unusually long to open. Another Monsterly tab or window ' +
          'may be blocking a storage upgrade — close every other tab of this app and reload.',
      );
    }, 8_000);

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

    loadDatabase()
      .catch((error: unknown) => {
        console.error('Failed to initialize the local database.', error);
      })
      .finally(() => {
        clearTimeout(slowOpenWarning);
      });

    return () => {
      isMounted = false;
      clearTimeout(slowOpenWarning);
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
