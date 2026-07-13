import { useContext, useEffect, useState } from 'react';

import type { PlanDocument } from '@/lib/local-db/monsterly-db';

import { DataLayerContext } from './data-layer-context';
import { watchActivePlans } from './plans.queries';

/** The catalog plans offered at registration, cheapest first. */
export function useActivePlans() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [plans, setPlans] = useState<PlanDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);

    const subscription = watchActivePlans({ activeOrganizationId, db }).subscribe((nextPlans) => {
      setPlans(nextPlans);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db]);

  return { isLoading, plans };
}
