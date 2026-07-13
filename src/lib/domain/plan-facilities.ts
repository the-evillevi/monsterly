import type { PlanFacility, SubscriptionKind } from '@/lib/local-db/monsterly-db';

import { subscriptionKindLabels } from './subscription-kind';

// Dragonz is the weightlifting gym, Monsters the CrossFit box; the existing
// kind labels double as the facility display names.
export const planFacilityLabels: Record<
  PlanFacility,
  (typeof subscriptionKindLabels)[SubscriptionKind]
> = {
  dragonz: subscriptionKindLabels.gym,
  monsters: subscriptionKindLabels.crossfit,
};

/**
 * Deprecated-kind fallback for subscriptions born from a catalog plan:
 * Monsters access reads as crossfit, everything else as gym. Facility truth
 * lives on the plan.
 */
export function planKind(facilityAccess: readonly string[]): SubscriptionKind {
  return facilityAccess.includes('monsters') ? 'crossfit' : 'gym';
}
