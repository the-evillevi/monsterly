import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { filter, firstValueFrom, take, timeout } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { closeMonsterlyDatabase, getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';
import { saveSubscriber } from './subscribers.commands';
import { listSubscribers, watchSubscriber, watchSubscribers } from './subscribers.queries';
import { saveSubscription } from './subscriptions.commands';
import { listSubscriptions } from './subscriptions.queries';

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

function waitForEmission<T>(
  observable: Parameters<typeof firstValueFrom<T>>[0],
  predicate: (value: T) => boolean,
) {
  return firstValueFrom(observable.pipe(filter(predicate), take(1), timeout({ first: 2_000 })));
}
