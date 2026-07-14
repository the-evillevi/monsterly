import { useContext, useEffect, useMemo, useState } from 'react';

import { combineLatest } from 'rxjs';

import { useLocalDayKey } from '@/hooks/use-local-day-key';
import {
  buildSubscriberSummaries,
  type SubscriberSummary,
  type SubscriptionStatus,
} from '@/lib/domain/subscriber-summaries';
import type { SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import { DataLayerContext } from './data-layer-context';
import { watchPlans } from './plans.queries';
import { watchSubscriber, watchSubscribers } from './subscribers.queries';
import type { SubscriberWithSubscriptions } from './subscriber-types';

export function useSubscriberSummaries(filterStatus?: SubscriptionStatus) {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [summaries, setSummaries] = useState<SubscriberSummary[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberWithSubscriptions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const localDayKey = useLocalDayKey();

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);

    const subscription = combineLatest([
      watchSubscribers({ activeOrganizationId, db }),
      // Plans feed the facility badges (a Combo member shows both gyms).
      watchPlans({ activeOrganizationId, db }),
    ]).subscribe(([nextSubscribers, plans]) => {
      const nextSummaries = buildSubscriberSummaries({
        plans,
        subscribers: nextSubscribers,
        subscriptions: nextSubscribers.flatMap((subscriber) => subscriber.subscriptions),
        today: new Date(`${localDayKey}T12:00:00`),
      });

      setSubscribers(nextSubscribers);
      setSummaries(nextSummaries);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db, localDayKey]);

  const filteredSummaries = useMemo(
    () =>
      filterStatus ? summaries.filter((summary) => summary.status === filterStatus) : summaries,
    [filterStatus, summaries],
  );

  // Per-member subscriptions for the row-level "Renovar" action.
  const subscriptionsBySubscriber = useMemo(
    () =>
      new Map<string, SubscriptionDocument[]>(
        subscribers.map((subscriber) => [subscriber.id, subscriber.subscriptions]),
      ),
    [subscribers],
  );

  return {
    isLoading,
    subscriptionsBySubscriber,
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
