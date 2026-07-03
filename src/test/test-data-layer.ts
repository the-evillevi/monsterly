import type { DataModuleContext } from '@/lib/data/data-layer-context';
import { closeMonsterlyDatabase, getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

export async function createTestDataContext(
  activeOrganizationId = 'organization-1',
): Promise<DataModuleContext> {
  const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

  return { activeOrganizationId, db };
}

export async function cleanupTestDatabase() {
  await closeMonsterlyDatabase();
  indexedDB.deleteDatabase('monsterly-test');
}
