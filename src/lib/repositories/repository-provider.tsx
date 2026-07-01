import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import { demoOrganizationId, RepositoryContext } from './repository-context';
import { createRxDbRepositories, type MonsterlyRepositories } from './rxdb-repositories';
import { seedDemoSubscribers } from './seed-demo-subscribers';

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<MonsterlyRepositories | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRepositories() {
      const db = await getMonsterlyDatabase();
      const nextRepositories = createRxDbRepositories({
        activeOrganizationId: demoOrganizationId,
        db,
      });

      await seedDemoSubscribers(nextRepositories);

      if (isMounted) {
        setRepositories(nextRepositories);
      }
    }

    void loadRepositories();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      activeOrganizationId: demoOrganizationId,
      repositories,
    }),
    [repositories],
  );

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}
