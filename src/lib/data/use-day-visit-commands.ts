import { useCallback, useContext } from 'react';

import { archiveDayVisit, recordDayVisit, type RecordDayVisitInput } from './day-visits.commands';
import { DataLayerContext } from './data-layer-context';

export function useRecordDayVisit() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (input: RecordDayVisitInput) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return recordDayVisit({ activeOrganizationId, db }, input);
    },
    [activeOrganizationId, db],
  );
}

export function useArchiveDayVisit() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);

  return useCallback(
    async (id: string) => {
      if (!db) {
        throw new Error('Local database is not ready yet.');
      }

      return archiveDayVisit({ activeOrganizationId, db }, id);
    },
    [activeOrganizationId, db],
  );
}
