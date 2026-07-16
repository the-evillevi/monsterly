import { useContext, useEffect, useMemo, useState } from 'react';

import { useLocalDayKey } from '@/hooks/use-local-day-key';
import { summarizeDayVisits } from '@/lib/domain/day-visits';
import type { DayVisitDocument } from '@/lib/local-db/monsterly-db';

import { watchDayVisits, watchSubscriberDayVisits } from './day-visits.queries';
import { DataLayerContext } from './data-layer-context';

export function useDayVisits() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [visits, setVisits] = useState<DayVisitDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const localDayKey = useLocalDayKey();

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);
    const subscription = watchDayVisits({ activeOrganizationId, db }).subscribe((nextVisits) => {
      setVisits(nextVisits);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db]);

  const todaySummary = useMemo(
    () => summarizeDayVisits(visits, localDayKey),
    [localDayKey, visits],
  );

  return { isLoading, localDayKey, todaySummary, visits };
}

export function useSubscriberDayVisits(subscriberId: string) {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [visits, setVisits] = useState<DayVisitDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);
    const subscription = watchSubscriberDayVisits(
      { activeOrganizationId, db },
      subscriberId,
    ).subscribe((nextVisits) => {
      setVisits(nextVisits);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db, subscriberId]);

  return { isLoading, visits };
}
