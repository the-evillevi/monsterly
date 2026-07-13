import { useContext, useEffect, useMemo, useState } from 'react';

import { combineLatest } from 'rxjs';

import { countUniqueCheckedInToday, startOfTodayIso } from '@/lib/domain/check-ins';
import {
  buildSubscriberSummaries,
  type SubscriberSummary,
} from '@/lib/domain/subscriber-summaries';
import type { CheckInDocument } from '@/lib/local-db/monsterly-db';

import { watchCheckIns } from './check-ins.queries';
import { DataLayerContext } from './data-layer-context';
import { watchPlans } from './plans.queries';
import { watchSubscribers } from './subscribers.queries';

export type CheckInFeedItem = {
  checkedInAt: string;
  id: string;
  subscriber?: SubscriberSummary;
};

/**
 * Live check-in stream joined to subscriber summaries. Status is always the
 * summary's current value, never a stored snapshot — a red feed item turns
 * green the moment the member renews.
 */
export function useCheckIns() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [checkIns, setCheckIns] = useState<CheckInDocument[]>([]);
  const [summaries, setSummaries] = useState<SubscriberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);

    const subscription = combineLatest([
      watchCheckIns({ activeOrganizationId, db }),
      watchSubscribers({ activeOrganizationId, db }),
      watchPlans({ activeOrganizationId, db }),
    ]).subscribe(([nextCheckIns, subscribers, plans]) => {
      setCheckIns(nextCheckIns);
      setSummaries(
        buildSubscriberSummaries({
          plans,
          subscribers,
          subscriptions: subscribers.flatMap((subscriber) => subscriber.subscriptions),
        }),
      );
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db]);

  const summariesById = useMemo(
    () => new Map(summaries.map((summary) => [summary.id, summary])),
    [summaries],
  );

  // checkIns arrive sorted newest-first from the query.
  const items = useMemo<CheckInFeedItem[]>(
    () =>
      checkIns.map((checkIn) => ({
        checkedInAt: checkIn.checked_in_at,
        id: checkIn.id,
        subscriber: summariesById.get(checkIn.subscriber_id),
      })),
    [checkIns, summariesById],
  );

  const todayItems = useMemo(() => {
    const todayStart = startOfTodayIso();
    return items.filter((item) => item.checkedInAt >= todayStart);
  }, [items]);

  const uniqueTodayCount = useMemo(() => countUniqueCheckedInToday(checkIns), [checkIns]);

  const latestBySubscriber = useMemo(() => {
    const latest = new Map<string, string>();
    for (const checkIn of checkIns) {
      if (!latest.has(checkIn.subscriber_id)) {
        latest.set(checkIn.subscriber_id, checkIn.checked_in_at);
      }
    }
    return latest;
  }, [checkIns]);

  return {
    isLoading,
    items,
    latestBySubscriber,
    todayItems,
    uniqueTodayCount,
  };
}
