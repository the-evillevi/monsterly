import { createContext } from 'react';

import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';
import { getConfiguredOrganizationId, hasSupabaseConfig } from '@/lib/supabase';

export const demoOrganizationId = 'local-demo-organization';

export function isDemoOrganizationId(organizationId: string) {
  return organizationId === demoOrganizationId || organizationId.startsWith('demo-');
}

export function resolveActiveOrganizationId() {
  return hasSupabaseConfig()
    ? (getConfiguredOrganizationId() ?? demoOrganizationId)
    : demoOrganizationId;
}

export function getLocalDatabaseName(activeOrganizationId: string) {
  // 'monsterly-demo' abandons pre-EVL-82 'monsterly' databases whose schema
  // hash no longer matches (RxDB DB6) instead of colliding with them.
  return isDemoOrganizationId(activeOrganizationId)
    ? 'monsterly-demo'
    : `monsterly-${activeOrganizationId.toLowerCase()}`;
}

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
