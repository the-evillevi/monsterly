import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { closeMonsterlyDatabase, getMonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import {
  createRxDbRepositories,
  type SubscriberRepository,
  type SubscriptionRepository,
} from './rxdb-repositories';

describe('RxDB repositories', () => {
  afterEach(async () => {
    await closeMonsterlyDatabase();
    indexedDB.deleteDatabase('monsterly-test');
  });

  it('exposes subscriber and subscription repository interfaces', async () => {
    const repositories = await createTestRepositories('organization-1');

    expectSatisfiesSubscriberRepository(repositories.subscribers);
    expectSatisfiesSubscriptionRepository(repositories.subscriptions);
  });

  it('scopes subscriber, subscription, and renewal reads and writes by active organization', async () => {
    const organizationOne = await createTestRepositories('organization-1');
    const organizationTwo = await createTestRepositories('organization-2');

    await organizationOne.subscribers.save({
      id: 'subscriber-1',
      name: 'Mariana Soto',
      gender: 'unspecified',
    });
    await organizationTwo.subscribers.save({
      id: 'subscriber-2',
      name: 'Carlos Perez',
      gender: 'unspecified',
    });

    await organizationOne.subscriptions.save({
      id: 'subscription-1',
      billing_period: 'monthly',
      kind: 'gym',
      paid_until_date: '2026-07-31',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-1',
    });
    await organizationTwo.subscriptions.save({
      id: 'subscription-2',
      billing_period: 'weekly',
      kind: 'crossfit',
      paid_until_date: '2026-07-07',
      start_date: '2026-07-01',
      subscriber_id: 'subscriber-2',
    });

    await organizationOne.subscriptions.recordRenewal({
      id: 'renewal-1',
      new_paid_until_date: '2026-08-31',
      previous_paid_until_date: '2026-07-31',
      subscription_id: 'subscription-1',
    });
    await organizationTwo.subscriptions.recordRenewal({
      id: 'renewal-2',
      new_paid_until_date: '2026-07-14',
      previous_paid_until_date: '2026-07-07',
      subscription_id: 'subscription-2',
    });

    await expect(organizationOne.subscribers.list()).resolves.toMatchObject([
      { id: 'subscriber-1', organization_id: 'organization-1' },
    ]);
    await expect(organizationOne.subscriptions.list()).resolves.toMatchObject([
      { id: 'subscription-1', organization_id: 'organization-1' },
    ]);
    await expect(organizationOne.subscriptions.listRenewals()).resolves.toMatchObject([
      { id: 'renewal-1', organization_id: 'organization-1' },
    ]);
  });

  it('keeps App UI code behind repository hooks instead of importing RxDB directly', async () => {
    const appSource = await readFile(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(appSource).not.toContain('local-db');
    expect(appSource).not.toContain('rxdb');
    expect(appSource).toContain('useSubscriberSummaries');
  });
});

async function createTestRepositories(activeOrganizationId: string) {
  const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

  return createRxDbRepositories({ activeOrganizationId, db });
}

function expectSatisfiesSubscriberRepository(repository: SubscriberRepository) {
  expect(repository.list).toEqual(expect.any(Function));
  expect(repository.save).toEqual(expect.any(Function));
}

function expectSatisfiesSubscriptionRepository(repository: SubscriptionRepository) {
  expect(repository.list).toEqual(expect.any(Function));
  expect(repository.listRenewals).toEqual(expect.any(Function));
  expect(repository.recordRenewal).toEqual(expect.any(Function));
  expect(repository.save).toEqual(expect.any(Function));
}
