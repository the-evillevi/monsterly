import { nextPaidUntilDate } from '@/lib/domain/billing-period';
import { newEntityId } from '@/lib/domain/subscriber-identity';
import type { RenewalDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export type SaveSubscriptionInput = {
  billing_period: SubscriptionDocument['billing_period'];
  custom_days?: number | null;
  id: string;
  // Either a catalog plan (which snapshots name/price and derives the
  // deprecated kind) or an explicit kind for legacy rows.
  kind?: SubscriptionDocument['kind'];
  paid_until_date: string;
  plan_id?: string;
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
  const [subscriber, existing] = await Promise.all([
    db.subscribers
      .findOne({
        selector: {
          ...activeRecordSelector(activeOrganizationId),
          id: input.subscriber_id,
        },
      })
      .exec(),
    db.subscriptions
      .findOne({
        selector: {
          id: input.id,
          organization_id: activeOrganizationId,
        },
      })
      .exec(),
  ]);

  if (!subscriber) {
    throw new Error('Subscriber must belong to the active organization.');
  }

  const plan = input.plan_id
    ? await db.plans
        .findOne({
          selector: {
            ...activeRecordSelector(activeOrganizationId),
            id: input.plan_id,
          },
        })
        .exec()
    : null;

  if (input.plan_id && !plan) {
    throw new Error('Plan must belong to the active organization.');
  }

  const kind = plan
    ? // Deprecated column, still populated: Monsters access reads as
      // crossfit; facility truth lives on the plan.
      plan.facility_access.includes('monsters')
      ? 'crossfit'
      : 'gym'
    : input.kind;

  if (!kind) {
    throw new Error('Subscription needs a plan or a kind.');
  }

  const subscription = {
    _deleted: false,
    _modified: now,
    billing_period: input.billing_period,
    // Null instead of undefined so incrementalPatch clears a stale day count
    // when the billing period stops being custom.
    custom_days: input.custom_days ?? null,
    id: input.id,
    kind,
    organization_id: activeOrganizationId,
    paid_until_date: input.paid_until_date,
    // Snapshot the plan at point of sale; catalog price changes must never
    // rewrite what this member actually pays. Omitted (undefined) when no
    // plan is given so edits of legacy rows leave stored values untouched.
    ...(plan ? { plan_id: plan.id, plan_name: plan.name, price: plan.price } : {}),
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

export type RenewSubscriptionInput = {
  billing_period: SubscriptionDocument['billing_period'];
  custom_days?: number | null;
  subscription_id: string;
  today?: Date;
};

export async function renewSubscription(context: DataModuleContext, input: RenewSubscriptionInput) {
  const { activeOrganizationId, db } = context;
  const subscriptionDocument = await db.subscriptions
    .findOne({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        id: input.subscription_id,
      },
    })
    .exec();

  if (!subscriptionDocument) {
    throw new Error('Subscription must belong to the active organization.');
  }

  const subscription = subscriptionDocument.toJSON();
  // The chosen period only drives the date math; the stored billing_period is
  // edited through saveSubscription, not through renewals.
  const newPaidUntilDate = nextPaidUntilDate(
    subscription.paid_until_date,
    input.billing_period,
    input.custom_days,
    input.today,
  );

  const updated = await saveSubscription(context, {
    billing_period: subscription.billing_period,
    custom_days: subscription.custom_days,
    id: subscription.id,
    kind: subscription.kind,
    paid_until_date: newPaidUntilDate,
    start_date: subscription.start_date,
    subscriber_id: subscription.subscriber_id,
  });

  try {
    await recordRenewal(context, {
      id: newEntityId(),
      new_paid_until_date: newPaidUntilDate,
      previous_paid_until_date: subscription.paid_until_date,
      subscription_id: subscription.id,
    });
  } catch (renewalError) {
    // The subscription is already renewed; failing here would make the UI
    // report an error and invite a retry that extends the period twice.
    console.error('Failed to record the renewal history entry.', renewalError);
  }

  return updated;
}

export async function archiveSubscription(
  { activeOrganizationId, db }: DataModuleContext,
  id: string,
) {
  const existing = await db.subscriptions
    .findOne({
      selector: {
        id,
        organization_id: activeOrganizationId,
      },
    })
    .exec();

  if (!existing) {
    throw new Error('Subscription must belong to the active organization.');
  }

  const now = new Date().toISOString();

  // deleted_at is the archive marker; _deleted stays false on purpose. Setting
  // _deleted would make RxDB purge the document and replicate a hard delete,
  // while deleted_at keeps the row replicating to Supabase as audit history.
  await existing.incrementalPatch({
    _modified: now,
    deleted_at: now,
    updated_at: now,
  });
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
