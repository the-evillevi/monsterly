import { useCallback, useContext } from 'react';

import { DataLayerContext } from './data-layer-context';
import { saveSubscriber, type SaveSubscriberInput } from './subscribers.commands';

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
