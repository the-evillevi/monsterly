import type { RenewalDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export type SaveSubscriptionInput = {
  billing_period: SubscriptionDocument['billing_period'];
  custom_days?: number;
  id: string;
  kind: SubscriptionDocument['kind'];
  paid_until_date: string;
  start_date: string;
  subscriber_id: string;
};

export type SaveRenewalInput = {
  id: string;
  new_paid_until_date: string;
  previous_paid_until_date: string;
  subscription_id: string;
};

export async function saveSubscription(
  { activeOrganizationId, db }: DataModuleContext,
  input: SaveSubscriptionInput,
) {
  const now = new Date().toISOString();
  const subscriber = await db.subscribers
    .findOne({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        id: input.subscriber_id,
      },
    })
    .exec();

  if (!subscriber) {
    throw new Error('Subscriber must belong to the active organization.');
  }

  const existing = await db.subscriptions
    .findOne({
      selector: {
        id: input.id,
        organization_id: activeOrganizationId,
      },
    })
    .exec();
  const subscription = {
    _deleted: false,
    _modified: now,
    billing_period: input.billing_period,
    custom_days: input.custom_days,
    id: input.id,
    kind: input.kind,
    organization_id: activeOrganizationId,
    paid_until_date: input.paid_until_date,
    start_date: input.start_date,
    subscriber_id: input.subscriber_id,
    updated_at: now,
  };

  if (existing) {
    await existing.incrementalPatch(subscription);

    return { ...existing.toJSON(), ...subscription };
  }

  const createdSubscription: SubscriptionDocument = {
    ...subscription,
    created_at: now,
  };

  await db.subscriptions.insert(createdSubscription);

  return createdSubscription;
}

export async function recordRenewal(
  { activeOrganizationId, db }: DataModuleContext,
  input: SaveRenewalInput,
) {
  const now = new Date().toISOString();
  const subscription = await db.subscriptions
    .findOne({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        id: input.subscription_id,
      },
    })
    .exec();

  if (!subscription) {
    throw new Error('Subscription must belong to the active organization.');
  }

  const renewal: RenewalDocument = {
    _deleted: false,
    _modified: now,
    created_at: now,
    id: input.id,
    new_paid_until_date: input.new_paid_until_date,
    organization_id: activeOrganizationId,
    previous_paid_until_date: input.previous_paid_until_date,
    subscription_id: input.subscription_id,
    updated_at: now,
  };

  await db.renewals.insert(renewal);

  return renewal;
}
