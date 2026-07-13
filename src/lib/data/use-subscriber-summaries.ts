import { useContext, useEffect, useMemo, useState } from 'react';

import { combineLatest } from 'rxjs';

import {
  buildSubscriberSummaries,
  type SubscriberSummary,
  type SubscriptionStatus,
} from '@/lib/domain/subscriber-summaries';

import { DataLayerContext } from './data-layer-context';
import { watchPlans } from './plans.queries';
import { watchSubscriber, watchSubscribers } from './subscribers.queries';
import type { SubscriberWithSubscriptions } from './subscriber-types';

export function useSubscriberSummaries(filterStatus?: SubscriptionStatus) {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [summaries, setSummaries] = useState<SubscriberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);

    const subscription = combineLatest([
      watchSubscribers({ activeOrganizationId, db }),
      // Plans feed the facility badges (a Combo member shows both gyms).
      watchPlans({ activeOrganizationId, db }),
    ]).subscribe(([subscribers, plans]) => {
      const nextSummaries = buildSubscriberSummaries({
        plans,
        subscribers,
        subscriptions: subscribers.flatMap((subscriber) => subscriber.subscriptions),
      });

      setSummaries(nextSummaries);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db]);

  const filteredSummaries = useMemo(
    () =>
      filterStatus ? summaries.filter((summary) => summary.status === filterStatus) : summaries,
    [filterStatus, summaries],
  );

  return {
    isLoading,
    summaries: filteredSummaries,
  };
}

export function useSubscriber(slugOrId: string) {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [subscriber, setSubscriber] = useState<SubscriberWithSubscriptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);

    const subscription = watchSubscriber({ activeOrganizationId, db }, slugOrId).subscribe(
      (nextSubscriber) => {
        setSubscriber(nextSubscriber);
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db, slugOrId]);

  return {
    isLoading,
    subscriber,
  };
}
