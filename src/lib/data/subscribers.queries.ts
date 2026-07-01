import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';

import type { SubscriberDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';
import type { SubscriberWithSubscriptions } from './subscriber-types';
import { listSubscriptions, watchSubscriptions } from './subscriptions.queries';

export function watchSubscribers(
  context: DataModuleContext,
): Observable<SubscriberWithSubscriptions[]> {
  const subscribers$ = context.db.subscribers
    .find({
      selector: {
        deleted_at: { $exists: false },
        organization_id: context.activeOrganizationId,
      },
      sort: [{ name: 'asc' }],
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));

  return combineLatest([subscribers$, watchSubscriptions(context)]).pipe(
    map(([subscribers, subscriptions]) =>
      subscribers.map((subscriber) => ({
        ...subscriber,
        subscriptions: subscriptions.filter(
          (subscription) => subscription.subscriber_id === subscriber.id,
        ),
      })),
    ),
  );
}

export function watchSubscriber(
  context: DataModuleContext,
  id: string,
): Observable<SubscriberWithSubscriptions | null> {
  return watchSubscribers(context).pipe(
    map((subscribers) => subscribers.find((subscriber) => subscriber.id === id) ?? null),
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
          deleted_at: { $exists: false },
          organization_id: activeOrganizationId,
        },
        sort: [{ name: 'asc' }],
      })
      .exec(),
    listSubscriptions({ activeOrganizationId, db }),
  ]);
  const subscribers: SubscriberDocument[] = subscriberDocuments.map((document) =>
    document.toJSON(),
  );

  return subscribers.map((subscriber) => ({
    ...subscriber,
    subscriptions: subscriptions.filter(
      (subscription) => subscription.subscriber_id === subscriber.id,
    ),
  }));
}
