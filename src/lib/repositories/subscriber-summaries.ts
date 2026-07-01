import type { SubscriberDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

export type SubscriptionStatus = 'Al corriente' | 'Por vencer' | 'Vencido';

export type SubscriberSummary = {
  id: string;
  name: string;
  paidUntilDate: string;
  paidUntilLabel: string;
  plan: string;
  status: SubscriptionStatus;
};

const warningWindowDays = 3;

export function buildSubscriberSummaries({
  subscribers,
  subscriptions,
  today = new Date(),
}: {
  subscribers: SubscriberDocument[];
  subscriptions: SubscriptionDocument[];
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
      plan: formatPlan(subscriberSubscriptions),
      status: getSubscriberStatus(subscriberSubscriptions, today),
    };
  });
}

function getSubscriberStatus(
  subscriptions: SubscriptionDocument[],
  today: Date,
): SubscriptionStatus {
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
  const paidUntil = startOfDay(new Date(`${paidUntilDate}T00:00:00`));
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

function getLatestPaidUntilDate(subscriptions: SubscriptionDocument[]) {
  return subscriptions
    .map((subscription) => subscription.paid_until_date)
    .sort((left, right) => right.localeCompare(left))[0];
}

function formatPaidUntilLabel(paidUntilDate?: string) {
  if (!paidUntilDate) {
    return 'No subscription';
  }

  const date = new Date(`${paidUntilDate}T00:00:00`);

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatPlan(subscriptions: SubscriptionDocument[]) {
  const kinds = subscriptions.map((subscription) => subscription.kind);

  if (kinds.includes('gym') && kinds.includes('crossfit')) {
    return 'Gym + CrossFit';
  }

  if (kinds.includes('crossfit')) {
    return 'CrossFit';
  }

  if (kinds.includes('gym')) {
    return 'Gym';
  }

  return 'No subscription';
}
