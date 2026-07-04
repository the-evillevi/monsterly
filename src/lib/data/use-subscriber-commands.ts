import { useCallback, useContext } from 'react';

import { DataLayerContext } from './data-layer-context';
import {
  archiveSubscriber,
  saveSubscriber,
  type SaveSubscriberInput,
} from './subscribers.commands';

export function useSaveSubscriber() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: SaveSubscriberInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return saveSubscriber({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}

export function useArchiveSubscriber() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (id: string) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return archiveSubscriber({ activeOrganizationId, db }, id);
    },
    [activeOrganizationId, db],
  );
}
