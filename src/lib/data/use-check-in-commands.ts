import { useCallback, useContext } from 'react';

import { recordCheckIn, type RecordCheckInInput } from './check-ins.commands';
import { DataLayerContext } from './data-layer-context';
import { findSubscriberByCheckInCode, getSubscriberSummary } from './subscribers.queries';

export function useFindSubscriberByCheckInCode() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (checkInCode: string) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return findSubscriberByCheckInCode({ activeOrganizationId, db }, checkInCode);
    },
    [activeOrganizationId, db],
  );
}

export function useGetSubscriberSummary() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (subscriberId: string) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return getSubscriberSummary({ activeOrganizationId, db }, subscriberId);
    },
    [activeOrganizationId, db],
  );
}

export function useRecordCheckIn() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: RecordCheckInInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return recordCheckIn({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}
