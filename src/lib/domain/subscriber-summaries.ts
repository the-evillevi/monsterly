import { parseDateOnly } from './date-only';
import { subscriptionKindLabels } from './subscription-kind';

export type SubscriptionStatus = 'Al corriente' | 'Por vencer' | 'Vencido';

export type SubscriberStatus = SubscriptionStatus | 'Sin suscripción';

export type SubscriptionPlan = 'Gym' | 'CrossFit';

type SubscriberSummarySource = {
  id: string;
  name: string;
  phone_number?: string | null;
};

type SubscriptionSummarySource = {
  kind: 'gym' | 'crossfit';
  paid_until_date: string;
  subscriber_id: string;
};

export type SubscriberSummary = {
  id: string;
  name: string;
  paidUntilDate?: string;
  paidUntilLabel: string;
  phoneNumber?: string;
  plans: SubscriptionPlan[];
  status: SubscriberStatus;
};

const warningWindowDays = 3;

export function buildSubscriberSummaries({
  subscribers,
  subscriptions,
  today = new Date(),
}: {
  subscribers: SubscriberSummarySource[];
  subscriptions: SubscriptionSummarySource[];
  today?: Date;
}): SubscriberSummary[] {
  return subscribers.map((subscriber) => {
    const subscriberSubscriptions = subscriptions.filter(
      (subscription) => subscription.subscriber_id === subscriber.id,
    );
    const latestPaidUntilDate = getLatestPaidUntilDate(subscriberSubscriptions);

    return {
      id: subscriber.id,
      name: subscriber.name,
      paidUntilDate: latestPaidUntilDate,
      paidUntilLabel: formatPaidUntilLabel(latestPaidUntilDate),
      phoneNumber: subscriber.phone_number ?? undefined,
      plans: getPlanLabels(subscriberSubscriptions),
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

function getPlanLabels(subscriptions: SubscriptionSummarySource[]): SubscriptionPlan[] {
  const kinds = new Set(subscriptions.map((subscription) => subscription.kind));
  const plans: SubscriptionPlan[] = [];

  if (kinds.has('gym')) {
    plans.push(subscriptionKindLabels.gym);
  }

  if (kinds.has('crossfit')) {
    plans.push(subscriptionKindLabels.crossfit);
  }

  return plans;
}
