import { createContext } from 'react';

import type { MonsterlyRepositories } from './rxdb-repositories';

export const demoOrganizationId = 'local-demo-organization';

type RepositoryContextValue = {
  activeOrganizationId: string;
  repositories: MonsterlyRepositories | null;
};

export const RepositoryContext = createContext<RepositoryContextValue>({
  activeOrganizationId: demoOrganizationId,
  repositories: null,
});
