import { useSyncExternalStore } from 'react';

import { appUpdateManager, type AppUpdateManager } from './app-update';

export function useAppUpdate(manager: AppUpdateManager = appUpdateManager) {
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot);
}
