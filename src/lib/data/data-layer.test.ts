import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { filter, firstValueFrom, take, timeout } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeMonsterlyDatabase,
  getMonsterlyDatabase,
  type RenewalDocument,
  type SubscriberDocument,
  type SubscriptionDocument,
} from '@/lib/local-db/monsterly-db';

import {
  type DataModuleContext,
  demoOrganizationId,
  getLocalDatabaseName,
} from './data-layer-context';
import { seedDemoSubscribers } from './seed-demo-subscribers';
import { archiveSubscriber, saveSubscriber } from './subscribers.commands';
import { listSubscribers, watchSubscriber, watchSubscribers } from './subscribers.queries';
import { recordRenewal, renewSubscription, saveSubscription } from './subscriptions.commands';
import {
  listRenewals,
  listSubscriptions,
  watchRenewals,
  watchSubscriptions,
} from './subscriptions.queries';

describe('RxDB data layer', () => {
  afterEach(async () => {
    await closeMonsterlyDatabase();
    indexedDB.deleteDatabase('monsterly-test');
  });

  it('scopes subscriber, subscription, and renewal reads by active organization', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationOne, {
      id: 'subscriber-1',
      name: 'Mariana Soto',
      gender: 'unspecified',
    });
    await saveSubscriber(organizationTwo, {
      id: 'subscriber-2',
      name: 'Carlos Perez',
      gender: 'unspecified',
    });

    await saveSubscription(organizationOne, {
      id: 'subscription-1',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });
    await saveSubscription(organizationTwo, {
      id: 'subscription-2',
      billing_period: 'weekly',
      kind: 'crossfit',
      paid_until_date: '2026-07-07',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-2',
    });

    await expect(listSubscribers(organizationOne)).resolves.toMatchObject([
      { id: 'subscriber-1', organization_id: 'organization-1' },
    ]);
    await expect(listSubscriptions(organizationOne)).resolves.toMatchObject([
      { id: 'subscription-1', organization_id: 'organization-1' },
    ]);
  });

  it('does not mutate another organization subscriber when ids collide', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationOne, {
      id: 'shared-subscriber-id',
      name: 'Original Org',
    });

    await expect(
      saveSubscriber(organizationTwo, {
        id: 'shared-subscriber-id',
        name: 'Wrong Org Update',
      }),
    ).rejects.toThrow();

    await expect(listSubscribers(organizationOne)).resolves.toMatchObject([
      {
        id: 'shared-subscriber-id',
        name: 'Original Org',
        organization_id: 'organization-1',
      },
    ]);
  });

  it('does not mutate another organization subscription when ids collide', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationOne, {
      id: 'subscriber-1',
      name: 'Original Subscriber',
    });
    await saveSubscriber(organizationTwo, {
      id: 'subscriber-2',
      name: 'Other Subscriber',
    });
    await saveSubscription(organizationOne, {
      id: 'shared-subscription-id',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    await expect(
      saveSubscription(organizationTwo, {
        id: 'shared-subscription-id',
        billing_period: 'weekly',
        kind: 'crossfit',
        paid_until_date: '2026-07-07',
        start_date: '2026-07-01',
        subscriber_id: 'subscriber-2',
      }),
    ).rejects.toThrow();

    await expect(listSubscriptions(organizationOne)).resolves.toMatchObject([
      {
        id: 'shared-subscription-id',
        kind: 'gym',
        organization_id: 'organization-1',
        paid_until_date: '2026-07-31',
      },
    ]);
  });

  it('watchSubscribers emits active organization rows and subscription updates', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');
    const subscriberRows = waitForEmission(watchSubscribers(organizationOne), (subscribers) =>
      subscribers.some((subscriber) => subscriber.id === 'subscriber-1'),
    );

    await saveSubscriber(organizationTwo, {
      id: 'subscriber-2',
      name: 'Other Organization',
    });
    await saveSubscriber(organizationOne, {
      id: 'subscriber-1',
      name: 'Mariana Soto',
    });

    await expect(subscriberRows).resolves.toMatchObject([
      {
        id: 'subscriber-1',
        organization_id: 'organization-1',
        subscriptions: [],
      },
    ]);

    const subscriptionRows = waitForEmission(
      watchSubscribers(organizationOne),
      (subscribers) => subscribers[0]?.subscriptions.length === 1,
    );

    await saveSubscription(organizationTwo, {
      id: 'subscription-2',
      billing_period: 'weekly',
      kind: 'crossfit',
      paid_until_date: '2026-07-07',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-2',
    });
    await saveSubscription(organizationOne, {
      id: 'subscription-1',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    await expect(subscriptionRows).resolves.toMatchObject([
      {
        id: 'subscriber-1',
        subscriptions: [{ id: 'subscription-1', organization_id: 'organization-1' }],
      },
    ]);
  });

  it('watchSubscriber emits null for missing active-org records and updates after writes', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');
    const missingSubscriber = firstValueFrom(watchSubscriber(organizationOne, 'subscriber-1'));

    await expect(missingSubscriber).resolves.toBeNull();

    const savedSubscriber = waitForEmission(
      watchSubscriber(organizationOne, 'subscriber-1'),
      (subscriber) => subscriber?.name === 'Mariana Soto',
    );

    await saveSubscriber(organizationTwo, {
      id: 'subscriber-2',
      name: 'Other Organization',
    });
    await saveSubscriber(organizationOne, {
      id: 'subscriber-1',
      name: 'Mariana Soto',
    });

    await expect(savedSubscriber).resolves.toMatchObject({
      id: 'subscriber-1',
      organization_id: 'organization-1',
    });
  });

  it('treats null deleted_at records as active and excludes timestamped deletes', async () => {
    const organizationOne = await createTestContext('organization-1');
    const now = new Date().toISOString();

    await organizationOne.db.subscribers.bulkInsert([
      createSubscriber({
        deleted_at: null,
        id: 'active-null-subscriber',
        name: 'Active Null',
        organization_id: 'organization-1',
      }),
      createSubscriber({
        deleted_at: now,
        id: 'deleted-subscriber',
        name: 'Deleted Subscriber',
        organization_id: 'organization-1',
      }),
    ]);
    await organizationOne.db.subscriptions.bulkInsert([
      createSubscription({
        deleted_at: null,
        id: 'active-null-subscription',
        organization_id: 'organization-1',
        subscriber_id: 'active-null-subscriber',
      }),
      createSubscription({
        deleted_at: now,
        id: 'deleted-subscription',
        organization_id: 'organization-1',
        subscriber_id: 'active-null-subscriber',
      }),
    ]);
    await organizationOne.db.renewals.bulkInsert([
      createRenewal({
        deleted_at: null,
        id: 'active-null-renewal',
        organization_id: 'organization-1',
        subscription_id: 'active-null-subscription',
      }),
      createRenewal({
        deleted_at: now,
        id: 'deleted-renewal',
        organization_id: 'organization-1',
        subscription_id: 'active-null-subscription',
      }),
    ]);

    await expect(listSubscribers(organizationOne)).resolves.toMatchObject([
      { id: 'active-null-subscriber' },
    ]);
    await expect(listSubscriptions(organizationOne)).resolves.toMatchObject([
      { id: 'active-null-subscription' },
    ]);
    await expect(listRenewals(organizationOne)).resolves.toMatchObject([
      { id: 'active-null-renewal' },
    ]);
    await expect(
      firstValueFrom(watchSubscribers(organizationOne).pipe(take(1))),
    ).resolves.toMatchObject([{ id: 'active-null-subscriber' }]);
    await expect(
      firstValueFrom(watchSubscriptions(organizationOne).pipe(take(1))),
    ).resolves.toMatchObject([{ id: 'active-null-subscription' }]);
    await expect(
      firstValueFrom(watchRenewals(organizationOne).pipe(take(1))),
    ).resolves.toMatchObject([{ id: 'active-null-renewal' }]);
  });

  it('rejects subscriptions for missing or cross-organization subscribers', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationTwo, {
      id: 'other-org-subscriber',
      name: 'Other Org Subscriber',
    });

    await expect(
      saveSubscription(organizationOne, {
        id: 'missing-subscriber-subscription',
        billing_period: 'monthly',
        kind: 'gym',
        paid_until_date: '2026-07-31',
        start_date: '2026-07-01',
        subscriber_id: 'missing-subscriber',
      }),
    ).rejects.toThrow('Subscriber must belong to the active organization.');
    await expect(
      saveSubscription(organizationOne, {
        id: 'cross-org-subscription',
        billing_period: 'monthly',
        kind: 'gym',
        paid_until_date: '2026-07-31',
        start_date: '2026-07-01',
        subscriber_id: 'other-org-subscriber',
      }),
    ).rejects.toThrow('Subscriber must belong to the active organization.');
    await expect(listSubscriptions(organizationOne)).resolves.toEqual([]);
  });

  it('preserves an existing subscription when a cross-organization subscriber update is rejected', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationOne, {
      id: 'active-subscriber',
      name: 'Active Subscriber',
    });
    await saveSubscriber(organizationTwo, {
      id: 'other-org-subscriber',
      name: 'Other Org Subscriber',
    });
    await saveSubscription(organizationOne, {
      id: 'subscription-1',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'active-subscriber',
    });

    await expect(
      saveSubscription(organizationOne, {
        id: 'subscription-1',
        billing_period: 'weekly',
        kind: 'crossfit',
        paid_until_date: '2026-07-07',
        start_date: '2026-07-01',
        subscriber_id: 'other-org-subscriber',
      }),
    ).rejects.toThrow('Subscriber must belong to the active organization.');

    await expect(listSubscriptions(organizationOne)).resolves.toMatchObject([
      {
        billing_period: 'monthly',
        id: 'subscription-1',
        kind: 'gym',
        paid_until_date: '2026-07-31',
        subscriber_id: 'active-subscriber',
      },
    ]);
  });

  it('rejects renewals for missing or cross-organization subscriptions', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');

    await saveSubscriber(organizationTwo, {
      id: 'other-org-subscriber',
      name: 'Other Org Subscriber',
    });
    await saveSubscription(organizationTwo, {
      id: 'other-org-subscription',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'other-org-subscriber',
    });

    await expect(
      recordRenewal(organizationOne, {
        id: 'missing-subscription-renewal',
        new_paid_until_date: '2026-08-31',
        previous_paid_until_date: '2026-07-31',
        subscription_id: 'missing-subscription',
      }),
    ).rejects.toThrow('Subscription must belong to the active organization.');
    await expect(
      recordRenewal(organizationOne, {
        id: 'cross-org-renewal',
        new_paid_until_date: '2026-08-31',
        previous_paid_until_date: '2026-07-31',
        subscription_id: 'other-org-subscription',
      }),
    ).rejects.toThrow('Subscription must belong to the active organization.');
    await expect(listRenewals(organizationOne)).resolves.toEqual([]);
  });

  it('clears the stored custom days when the billing period stops being custom', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(context, {
      billing_period: 'custom',
      custom_days: 10,
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-07-14',
      start_date: '2026-07-04',
      subscriber_id: 'subscriber-1',
    });

    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-08-04',
      start_date: '2026-07-04',
      subscriber_id: 'subscriber-1',
    });

    const [subscription] = await listSubscriptions(context);
    expect(subscription?.billing_period).toBe('monthly');
    expect(subscription?.custom_days).toBeNull();
  });

  it('renews an active subscription from its paid-until date and records the renewal', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-07-20',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    await renewSubscription(context, {
      billing_period: 'monthly',
      subscription_id: 'subscription-1',
      today: new Date(2026, 6, 4),
    });

    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { id: 'subscription-1', paid_until_date: '2026-08-20' },
    ]);
    await expect(listRenewals(context)).resolves.toMatchObject([
      {
        new_paid_until_date: '2026-08-20',
        previous_paid_until_date: '2026-07-20',
        subscription_id: 'subscription-1',
      },
    ]);
  });

  it('renews an expired subscription from today', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-06-20',
      start_date: '2026-05-20',
      subscriber_id: 'subscriber-1',
    });

    await renewSubscription(context, {
      billing_period: 'weekly',
      subscription_id: 'subscription-1',
      today: new Date(2026, 6, 4),
    });

    await expect(listSubscriptions(context)).resolves.toMatchObject([
      // The one-off weekly renewal does not change the stored billing period.
      { billing_period: 'monthly', id: 'subscription-1', paid_until_date: '2026-07-11' },
    ]);
    await expect(listRenewals(context)).resolves.toMatchObject([
      { new_paid_until_date: '2026-07-11', previous_paid_until_date: '2026-06-20' },
    ]);
  });

  it('renews custom periods using the given day count', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(context, {
      billing_period: 'custom',
      custom_days: 10,
      id: 'subscription-1',
      kind: 'crossfit',
      paid_until_date: '2026-07-20',
      start_date: '2026-07-10',
      subscriber_id: 'subscriber-1',
    });

    await renewSubscription(context, {
      billing_period: 'custom',
      custom_days: 15,
      subscription_id: 'subscription-1',
      today: new Date(2026, 6, 4),
    });

    await expect(listSubscriptions(context)).resolves.toMatchObject([
      { id: 'subscription-1', paid_until_date: '2026-08-04' },
    ]);
  });

  it('rejects renewing subscriptions outside the active organization', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');
    await saveSubscriber(organizationOne, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(organizationOne, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-07-20',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    await expect(
      renewSubscription(organizationTwo, {
        billing_period: 'monthly',
        subscription_id: 'subscription-1',
      }),
    ).rejects.toThrow('Subscription must belong to the active organization.');
    await expect(listRenewals(organizationTwo)).resolves.toEqual([]);
  });

  it('keeps demo and sync organizations in separate local databases', () => {
    expect(getLocalDatabaseName(demoOrganizationId)).toBe('monsterly-demo');
    expect(getLocalDatabaseName('demo-organization-2')).toBe('monsterly-demo');
    expect(getLocalDatabaseName('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(
      'monsterly-3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    );
  });

  it('generates a subscriber id when none is provided', async () => {
    const context = await createTestContext('organization-1');

    const created = await saveSubscriber(context, { name: 'Ana Torres' });

    expect(created.id).toBeTruthy();
    await expect(listSubscribers(context)).resolves.toMatchObject([
      { id: created.id, name: 'Ana Torres' },
    ]);
  });

  it('rejects phone numbers outside 10 to 15 digits', async () => {
    const context = await createTestContext('organization-1');

    await expect(
      saveSubscriber(context, { name: 'Levi Carbellido', phone_number: '55 7207' }),
    ).rejects.toThrow('Subscriber phone number must have 10 to 15 digits.');
    await expect(
      saveSubscriber(context, { name: 'Levi Carbellido', phone_number: '+52 55 7207 0000' }),
    ).resolves.toMatchObject({ phone_number: '+52 55 7207 0000' });
  });

  it('clears the stored phone number when an edit omits it', async () => {
    const context = await createTestContext('organization-1');

    await saveSubscriber(context, {
      id: 'subscriber-1',
      name: 'Ana Torres',
      phone_number: '+52 55 0000 0001',
    });
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    const [subscriber] = await listSubscribers(context);
    expect(subscriber?.phone_number).toBeNull();
  });

  it('archives with a soft delete that keeps the row replicable', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await archiveSubscriber(context, 'subscriber-1');

    await expect(listSubscribers(context)).resolves.toEqual([]);

    const rawDocument = await context.db.subscribers
      .findOne({ selector: { id: 'subscriber-1' } })
      .exec();
    expect(rawDocument).not.toBeNull();
    expect(rawDocument?.deleted).toBe(false);
    expect(rawDocument?.toJSON().deleted_at).toBeTruthy();
  });

  it('drops archived subscribers from reactive queries', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    await waitForEmission(watchSubscribers(context), (subscribers) => subscribers.length === 1);
    await archiveSubscriber(context, 'subscriber-1');

    await expect(
      waitForEmission(watchSubscribers(context), (subscribers) => subscribers.length === 0),
    ).resolves.toEqual([]);
  });

  it('keeps subscriptions untouched when the subscriber is archived', async () => {
    const context = await createTestContext('organization-1');
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: '2026-08-01',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });

    await archiveSubscriber(context, 'subscriber-1');

    await expect(listSubscriptions(context)).resolves.toMatchObject([{ id: 'subscription-1' }]);
  });

  it('rejects archiving subscribers outside the active organization', async () => {
    const organizationOne = await createTestContext('organization-1');
    const organizationTwo = await createTestContext('organization-2');
    await saveSubscriber(organizationOne, { id: 'subscriber-1', name: 'Ana Torres' });

    await expect(archiveSubscriber(organizationTwo, 'subscriber-1')).rejects.toThrow(
      'Subscriber must belong to the active organization.',
    );
  });

  it('rejects empty subscriber names', async () => {
    const context = await createTestContext('organization-1');

    await expect(saveSubscriber(context, { name: '   ' })).rejects.toThrow(
      'Subscriber name is required.',
    );
    await expect(listSubscribers(context)).resolves.toEqual([]);
  });

  it('skips demo seeding when a sync organization is active', async () => {
    const syncContext = await createTestContext('3f2504e0-4f89-41d3-9a0c-0305e82c3301');

    await seedDemoSubscribers(syncContext);

    await expect(listSubscribers(syncContext)).resolves.toEqual([]);
  });

  it('seeds demo data for the offline demo organization', async () => {
    const demoContext = await createTestContext(demoOrganizationId);

    await seedDemoSubscribers(demoContext);

    const subscribers = await listSubscribers(demoContext);

    expect(subscribers.length).toBeGreaterThan(0);
    expect(subscribers.every((subscriber) => subscriber.id.startsWith('demo-subscriber-'))).toBe(
      true,
    );
  });

  it('keeps App UI code behind feature hooks instead of importing RxDB directly', async () => {
    const appSource = await readFile(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(appSource).not.toContain('local-db');
    expect(appSource).not.toContain('rxdb');
    expect(appSource).toContain('useSubscriberSummaries');
  });
});

async function createTestContext(activeOrganizationId: string): Promise<DataModuleContext> {
  const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

  return {
    activeOrganizationId,
    db,
  };
}

function createSubscriber(input: Partial<SubscriberDocument> & Pick<SubscriberDocument, 'id'>) {
  const now = new Date().toISOString();

  return {
    _deleted: false,
    _modified: now,
    created_at: now,
    gender: 'unspecified',
    name: 'Test Subscriber',
    organization_id: 'organization-1',
    updated_at: now,
    ...input,
  } satisfies SubscriberDocument;
}

function createSubscription(
  input: Partial<SubscriptionDocument> & Pick<SubscriptionDocument, 'id' | 'subscriber_id'>,
) {
  const now = new Date().toISOString();

  return {
    _deleted: false,
    _modified: now,
    billing_period: 'monthly',
    created_at: now,
    kind: 'gym',
    organization_id: 'organization-1',
    paid_until_date: '2026-07-31',
    start_date: '2026-07-01',
    updated_at: now,
    ...input,
  } satisfies SubscriptionDocument;
}

function createRenewal(
  input: Partial<RenewalDocument> & Pick<RenewalDocument, 'id' | 'subscription_id'>,
) {
  const now = new Date().toISOString();

  return {
    _deleted: false,
    _modified: now,
    created_at: now,
    new_paid_until_date: '2026-08-31',
    organization_id: 'organization-1',
    previous_paid_until_date: '2026-07-31',
    updated_at: now,
    ...input,
  } satisfies RenewalDocument;
}

function waitForEmission<T>(
  observable: Parameters<typeof firstValueFrom<T>>[0],
  predicate: (value: T) => boolean,
) {
  return firstValueFrom(observable.pipe(filter(predicate), take(1), timeout({ first: 2_000 })));
}
