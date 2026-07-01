import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { getMonsterlyDatabase, type MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import { DataLayerContext, demoOrganizationId } from './data-layer-context';
import { seedDemoSubscribers } from './seed-demo-subscribers';

export function DataLayerProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<MonsterlyDatabase | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDatabase() {
      const nextDb = await getMonsterlyDatabase();

      await seedDemoSubscribers({
        activeOrganizationId: demoOrganizationId,
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
  }, []);

  const value = useMemo(
    () => ({
      activeOrganizationId: demoOrganizationId,
      db,
    }),
    [db],
  );

  return <DataLayerContext.Provider value={value}>{children}</DataLayerContext.Provider>;
}
