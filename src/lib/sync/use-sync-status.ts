import { useContext, useSyncExternalStore } from 'react';

import { SyncStatusContext } from './sync-context';

export function useSyncStatus() {
  const store = useContext(SyncStatusContext);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
