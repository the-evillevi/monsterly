import type { SubscriberDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

export type SubscriberWithSubscriptions = SubscriberDocument & {
  subscriptions: SubscriptionDocument[];
};
