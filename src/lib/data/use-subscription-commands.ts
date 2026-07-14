import { useCallback, useContext } from 'react';

import { DataLayerContext } from './data-layer-context';
import {
  archiveSubscription,
  recordRenewal,
  renewSubscription,
  type RenewSubscriptionInput,
  type SaveRenewalInput,
  saveSubscription,
  type SaveSubscriptionInput,
} from './subscriptions.commands';

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

export function useRecordRenewal() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: SaveRenewalInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return recordRenewal({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}

export function useRenewSubscription() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: RenewSubscriptionInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return renewSubscription({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}

export function useArchiveSubscription() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (id: string) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return archiveSubscription({ activeOrganizationId, db }, id);
    },
    [activeOrganizationId, db],
  );
}
