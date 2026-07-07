import type { SubscriptionKind } from '@/lib/local-db/monsterly-db';

export const subscriptionKindLabels = {
  crossfit: 'CrossFit',
  gym: 'Gym',
} as const satisfies Record<SubscriptionKind, string>;
