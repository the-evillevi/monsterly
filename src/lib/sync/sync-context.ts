import { createContext } from 'react';

import { createSyncStatusStore } from './supabase-sync';

export const SyncStatusContext = createContext(createSyncStatusStore());
