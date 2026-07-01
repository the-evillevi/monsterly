import { createContext } from 'react';

import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

export const demoOrganizationId = 'local-demo-organization';

export type DataLayerContextValue = {
  activeOrganizationId: string;
  db: MonsterlyDatabase | null;
};

export type DataModuleContext = {
  activeOrganizationId: string;
  db: MonsterlyDatabase;
};

export const DataLayerContext = createContext<DataLayerContextValue>({
  activeOrganizationId: demoOrganizationId,
  db: null,
});
