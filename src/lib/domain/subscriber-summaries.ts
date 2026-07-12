import { parseDateOnly } from './date-only';
import { formatFullName } from './subscriber-identity';
import { subscriptionKindLabels } from './subscription-kind';

export type SubscriptionStatus = 'Al corriente' | 'Por vencer' | 'Vencido';

export type SubscriberStatus = SubscriptionStatus | 'Sin suscripción';

export type SubscriptionPlan = 'Gym' | 'CrossFit';

type SubscriberSummarySource = {
  id: string;
  maternal_last_name?: string | null;
  name: string;
  paternal_last_name?: string | null;
  phone_number?: string | null;
  slug?: string | null;
};

type SubscriptionSummarySource = {
  kind: 'gym' | 'crossfit';
  paid_until_date: string;
  plan_id?: string | null;
  subscriber_id: string;
};

type PlanSummarySource = {
  facility_access: readonly string[];
  id: string;
};

export type SubscriberSummary = {
  id: string;
  name: string;
  paidUntilDate?: string;
  paidUntilLabel: string;
  phoneNumber?: string;
  plans: SubscriptionPlan[];
  slug?: string;
  status: SubscriberStatus;
};

const warningWindowDays = 3;

export function buildSubscriberSummaries({
  plans = [],
  subscribers,
  subscriptions,
  today = new Date(),
}: {
  plans?: PlanSummarySource[];
  subscribers: SubscriberSummarySource[];
  subscriptions: SubscriptionSummarySource[];
  today?: Date;
}): SubscriberSummary[] {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));

  return subscribers.map((subscriber) => {
    const subscriberSubscriptions = subscriptions.filter(
      (subscription) => subscription.subscriber_id === subscriber.id,
    );
    const latestPaidUntilDate = getLatestPaidUntilDate(subscriberSubscriptions);

    return {
      id: subscriber.id,
      name: formatFullName(subscriber),
      paidUntilDate: latestPaidUntilDate,
      paidUntilLabel: formatPaidUntilLabel(latestPaidUntilDate),
      phoneNumber: subscriber.phone_number ?? undefined,
      plans: getPlanLabels(subscriberSubscriptions, plansById),
      slug: subscriber.slug ?? undefined,
      status: getSubscriberStatus(subscriberSubscriptions, today),
    };
  });
}

function getSubscriberStatus(
  subscriptions: SubscriptionSummarySource[],
  today: Date,
): SubscriberStatus {
  if (subscriptions.length === 0) {
    return 'Sin suscripción';
  }

  const statuses = subscriptions.map((subscription) =>
    getSubscriptionStatus(subscription.paid_until_date, today),
  );

  if (statuses.includes('Vencido')) {
    return 'Vencido';
  }

  if (statuses.includes('Por vencer')) {
    return 'Por vencer';
  }

  return 'Al corriente';
}

function getSubscriptionStatus(paidUntilDate: string, today: Date): SubscriptionStatus {
  const paidUntil = startOfDay(parseDateOnly(paidUntilDate));
  const currentDay = startOfDay(today);
  const warningLimit = new Date(currentDay);
  warningLimit.setDate(warningLimit.getDate() + warningWindowDays);

  if (paidUntil < currentDay) {
    return 'Vencido';
  }

  if (paidUntil <= warningLimit) {
    return 'Por vencer';
  }

  return 'Al corriente';
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLatestPaidUntilDate(subscriptions: SubscriptionSummarySource[]): string | undefined {
  return subscriptions
    .map((subscription) => subscription.paid_until_date)
    .sort((left, right) => right.localeCompare(left))[0];
}

function formatPaidUntilLabel(paidUntilDate?: string) {
  if (!paidUntilDate) {
    return 'Sin suscripción';
  }

  const date = parseDateOnly(paidUntilDate);

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

// Facility badges: a plan's facility set is the truth (a Combo member shows
// both gyms); rows without a catalog plan fall back to the deprecated kind.
function getPlanLabels(
  subscriptions: SubscriptionSummarySource[],
  plansById: Map<string, PlanSummarySource>,
): SubscriptionPlan[] {
  const labels = new Set<SubscriptionPlan>();

  for (const subscription of subscriptions) {
    const plan = subscription.plan_id ? plansById.get(subscription.plan_id) : undefined;

    if (plan) {
      if (plan.facility_access.includes('dragonz')) {
        labels.add(subscriptionKindLabels.gym);
      }
      if (plan.facility_access.includes('monsters')) {
        labels.add(subscriptionKindLabels.crossfit);
      }
    } else {
      labels.add(subscriptionKindLabels[subscription.kind]);
    }
  }

  const orderedLabels: SubscriptionPlan[] = [
    subscriptionKindLabels.gym,
    subscriptionKindLabels.crossfit,
  ];

  return orderedLabels.filter((label) => labels.has(label));
}
