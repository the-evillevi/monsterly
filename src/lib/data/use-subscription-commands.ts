import { useCallback, useContext } from 'react';

import { DataLayerContext } from './data-layer-context';
import { saveSubscription, type SaveSubscriptionInput } from './subscriptions.commands';

export function useSaveSubscription() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: SaveSubscriptionInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return saveSubscription({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}
