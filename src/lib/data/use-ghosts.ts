import { useContext, useEffect, useMemo, useState } from 'react';

import { combineLatest } from 'rxjs';

import { useLocalDayKey } from '@/hooks/use-local-day-key';
import { buildGhosts, type GhostRecord, type GhostSource } from '@/lib/domain/ghosts';
import {
  buildSubscriberSummaries,
  type SubscriberSummary,
} from '@/lib/domain/subscriber-summaries';
import type { RenewalDocument } from '@/lib/local-db/monsterly-db';

import { watchCheckIns } from './check-ins.queries';
import { DataLayerContext } from './data-layer-context';
import { watchPlans } from './plans.queries';
import { watchRenewals } from './subscriptions.queries';
import { watchSubscribers } from './subscribers.queries';
import type { SubscriberWithSubscriptions } from './subscriber-types';

function laterDate(left: string | undefined, right: string): string {
  return left && left >= right ? left : right;
}

function buildGhostSources(
  subscribers: SubscriberWithSubscriptions[],
  summaries: SubscriberSummary[],
  latestCheckInBySubscriber: Map<string, string>,
  renewals: RenewalDocument[],
): GhostSource[] {
  const summariesById = new Map(summaries.map((summary) => [summary.id, summary]));

  // Renewal history is keyed by subscription; resolve each to its subscriber so
  // the last payment counts as a "last seen" signal before any check-in.
  const subscriberBySubscription = new Map<string, string>();
  for (const subscriber of subscribers) {
    for (const subscription of subscriber.subscriptions) {
      subscriberBySubscription.set(subscription.id, subscriber.id);
    }
  }

  const baselineBySubscriber = new Map<string, string>();
  for (const subscriber of subscribers) {
    for (const subscription of subscriber.subscriptions) {
      baselineBySubscriber.set(
        subscriber.id,
        laterDate(baselineBySubscriber.get(subscriber.id), subscription.start_date),
      );
    }
  }
  for (const renewal of renewals) {
    const subscriberId = subscriberBySubscription.get(renewal.subscription_id);

    if (subscriberId) {
      baselineBySubscriber.set(
        subscriberId,
        laterDate(baselineBySubscriber.get(subscriberId), renewal.created_at),
      );
    }
  }

  return subscribers.map((subscriber) => {
    const summary = summariesById.get(subscriber.id);

    return {
      baselineDate: baselineBySubscriber.get(subscriber.id),
      checkInCode: summary?.checkInCode,
      id: subscriber.id,
      latestCheckInAt: latestCheckInBySubscriber.get(subscriber.id),
      name: summary?.name ?? subscriber.name,
      nameParts: summary?.nameParts ?? {
        maternal_last_name: subscriber.maternal_last_name,
        name: subscriber.name,
        paternal_last_name: subscriber.paternal_last_name,
      },
      phoneNumber: summary?.phoneNumber,
      plans: summary?.plans ?? [],
      slug: summary?.slug,
      status: summary?.status ?? 'Sin suscripción',
    };
  });
}

export function useGhosts() {
  const { activeOrganizationId, db } = useContext(DataLayerContext);
  const [ghosts, setGhosts] = useState<GhostRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const localDayKey = useLocalDayKey();

  useEffect(() => {
    if (!db) {
      return;
    }

    setIsLoading(true);
    const context = { activeOrganizationId, db };

    const subscription = combineLatest([
      watchSubscribers(context),
      watchPlans(context),
      watchCheckIns(context),
      watchRenewals(context),
    ]).subscribe(([subscribers, plans, checkIns, renewals]) => {
      const summaries = buildSubscriberSummaries({
        plans,
        subscribers,
        subscriptions: subscribers.flatMap((subscriber) => subscriber.subscriptions),
        today: new Date(`${localDayKey}T12:00:00`),
      });

      // check_ins arrive newest-first, so the first per subscriber is the latest.
      const latestCheckInBySubscriber = new Map<string, string>();
      for (const checkIn of checkIns) {
        if (!latestCheckInBySubscriber.has(checkIn.subscriber_id)) {
          latestCheckInBySubscriber.set(checkIn.subscriber_id, checkIn.checked_in_at);
        }
      }

      setGhosts(
        buildGhosts(
          buildGhostSources(subscribers, summaries, latestCheckInBySubscriber, renewals),
          new Date(`${localDayKey}T12:00:00`),
        ),
      );
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [activeOrganizationId, db, localDayKey]);

  return useMemo(() => ({ ghosts, isLoading }), [ghosts, isLoading]);
}
