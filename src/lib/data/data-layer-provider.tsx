import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { LocalDatabaseRecoveryBanner } from '@/components/local-database-recovery-banner';
import { getMonsterlyDatabase, type MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import {
  DataLayerContext,
  getLocalDatabaseName,
  resolveActiveOrganizationId,
} from './data-layer-context';
import { seedDemoSubscribers } from './seed-demo-subscribers';

const slowOpenTimeoutMs = 8_000;
const failedOpenAttemptsKey = 'monsterly-db-open-attempts';
// The destructive "reset local data" escape hatch only appears once a plain
// reload has already failed to fix a hung open.
const failedAttemptsBeforeReset = 2;

// localStorage can be missing or throw (privacy modes); losing the attempt
// counter only means the reset button needs one extra failed reload to show.
function getAttemptStorage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readFailedOpenAttempts() {
  return Number(getAttemptStorage()?.getItem(failedOpenAttemptsKey)) || 0;
}

/**
 * Best-effort wipe of every RxDB Dexie database so the next load re-pulls
 * everything from Supabase. Deletions blocked by another tab resolve once
 * that tab closes; the reload proceeds either way.
 */
async function resetLocalDatabases() {
  const databases = await window.indexedDB.databases();

  await Promise.allSettled(
    databases
      .filter((database) => database.name?.startsWith('rxdb-dexie-'))
      .map(
        (database) =>
          new Promise<void>((resolve) => {
            const request = window.indexedDB.deleteDatabase(database.name ?? '');

            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
  );

  getAttemptStorage()?.removeItem(failedOpenAttemptsKey);
  window.location.reload();
}

export function DataLayerProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<MonsterlyDatabase | null>(null);
  const [openTimedOut, setOpenTimedOut] = useState(false);
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
      getAttemptStorage()?.setItem(failedOpenAttemptsKey, String(readFailedOpenAttempts() + 1));

      if (isMounted) {
        setOpenTimedOut(true);
      }
    }, slowOpenTimeoutMs);

    async function loadDatabase() {
      const nextDb = await getMonsterlyDatabase({
        name: getLocalDatabaseName(activeOrganizationId),
      });

      await seedDemoSubscribers({
        activeOrganizationId,
        db: nextDb,
      });

      getAttemptStorage()?.removeItem(failedOpenAttemptsKey);

      if (isMounted) {
        setOpenTimedOut(false);
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

  return (
    <DataLayerContext.Provider value={value}>
      {!db && openTimedOut ? (
        <LocalDatabaseRecoveryBanner
          onReset={resetLocalDatabases}
          showReset={readFailedOpenAttempts() >= failedAttemptsBeforeReset}
        />
      ) : null}
      {children}
    </DataLayerContext.Provider>
  );
}
