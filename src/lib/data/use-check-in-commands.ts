import { useCallback, useContext } from 'react';

import { recordCheckIn, type RecordCheckInInput } from './check-ins.commands';
import { DataLayerContext } from './data-layer-context';

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
