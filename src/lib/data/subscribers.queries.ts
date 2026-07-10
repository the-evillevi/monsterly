import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';

import type { SubscriberDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';
import type { SubscriberWithSubscriptions } from './subscriber-types';
import { listSubscriptions, watchSubscriptions } from './subscriptions.queries';
import { activeRecordSelector } from './active-records';

function joinSubscriptions(
  subscribers: SubscriberDocument[],
  subscriptions: SubscriptionDocument[],
): SubscriberWithSubscriptions[] {
  const subscriptionsBySubscriber = new Map<string, SubscriptionDocument[]>();

  for (const subscription of subscriptions) {
    const existing = subscriptionsBySubscriber.get(subscription.subscriber_id);

    if (existing) {
      existing.push(subscription);
    } else {
      subscriptionsBySubscriber.set(subscription.subscriber_id, [subscription]);
    }
  }

  return subscribers.map((subscriber) => ({
    ...subscriber,
    subscriptions: subscriptionsBySubscriber.get(subscriber.id) ?? [],
  }));
}

export function watchSubscribers(
  context: DataModuleContext,
): Observable<SubscriberWithSubscriptions[]> {
  const subscribers$ = context.db.subscribers
    .find({
      selector: {
        ...activeRecordSelector(context.activeOrganizationId),
      },
      sort: [{ name: 'asc' }],
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));

  return combineLatest([subscribers$, watchSubscriptions(context)]).pipe(
    map(([subscribers, subscriptions]) => joinSubscriptions(subscribers, subscriptions)),
  );
}

export function watchSubscriber(
  context: DataModuleContext,
  slugOrId: string,
): Observable<SubscriberWithSubscriptions | null> {
  // Slug is the canonical route param; matching the id keeps pre-slug URLs
  // working (the edit page redirects those to the slug form).
  return watchSubscribers(context).pipe(
    map(
      (subscribers) =>
        subscribers.find(
          (subscriber) => subscriber.slug === slugOrId || subscriber.id === slugOrId,
        ) ?? null,
    ),
  );
}

export async function listSubscribers({
  activeOrganizationId,
  db,
}: DataModuleContext): Promise<SubscriberWithSubscriptions[]> {
  const [subscriberDocuments, subscriptions] = await Promise.all([
    db.subscribers
      .find({
        selector: {
          ...activeRecordSelector(activeOrganizationId),
        },
        sort: [{ name: 'asc' }],
      })
      .exec(),
    listSubscriptions({ activeOrganizationId, db }),
  ]);
  const subscribers: SubscriberDocument[] = subscriberDocuments.map((document) =>
    document.toJSON(),
  );

  return joinSubscriptions(subscribers, subscriptions);
}
