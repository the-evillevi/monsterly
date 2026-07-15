import type { SubscriberStatus, SubscriptionPlan } from './subscriber-summaries';
import type { SubscriberNameParts } from './subscriber-identity';

// An active member unseen this long is a churn risk worth a follow-up.
export const ghostThresholdDays = 14;

export type GhostSource = {
  // max(latest subscription start_date, latest renewal created_at); the "last
  // seen" fallback before any check-in exists (cold start).
  baselineDate?: string;
  checkInCode?: string;
  id: string;
  // Most recent check-in timestamp, if the member has ever scanned.
  latestCheckInAt?: string;
  name: string;
  nameParts: SubscriberNameParts;
  phoneNumber?: string;
  plans: SubscriptionPlan[];
  slug?: string;
  status: SubscriberStatus;
};

export type GhostRecord = {
  daysMissing: number;
  checkInCode?: string;
  id: string;
  lastSeenDate: string;
  lastSeenKind: 'baseline' | 'check_in';
  name: string;
  nameParts: SubscriberNameParts;
  phoneNumber?: string;
  plans: SubscriptionPlan[];
  slug?: string;
};

// Local-day index for date-only ("2026-07-01") and full timestamps alike, so
// day differences ignore the time of day and the source format.
function toLocalDayIndex(value: string): number {
  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);

  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  );
}

/**
 * Members at churn risk: status is Al corriente but their last sign of life —
 * a check-in, or the day they last paid/started if they have never scanned —
 * is at least {@link ghostThresholdDays} days old. Sorted most-missing first.
 * Computed at read time; nothing here is stored.
 */
export function buildGhosts(sources: GhostSource[], today = new Date()): GhostRecord[] {
  const todayIndex = toLocalDayIndex(today.toISOString());

  return sources
    .filter((source) => source.status === 'Al corriente')
    .map((source): GhostRecord | null => {
      const lastSeenDate = source.latestCheckInAt ?? source.baselineDate;

      if (!lastSeenDate) {
        return null;
      }

      const daysMissing = todayIndex - toLocalDayIndex(lastSeenDate);

      return {
        checkInCode: source.checkInCode,
        daysMissing,
        id: source.id,
        lastSeenDate,
        lastSeenKind: source.latestCheckInAt ? 'check_in' : 'baseline',
        name: source.name,
        nameParts: source.nameParts,
        phoneNumber: source.phoneNumber,
        plans: source.plans,
        slug: source.slug,
      };
    })
    .filter(
      (ghost): ghost is GhostRecord => ghost !== null && ghost.daysMissing >= ghostThresholdDays,
    )
    .sort((left, right) => right.daysMissing - left.daysMissing);
}
