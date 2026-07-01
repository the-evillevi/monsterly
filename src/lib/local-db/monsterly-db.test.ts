import { afterEach, describe, expect, it } from 'vitest';

import {
  closeMonsterlyDatabase,
  getMonsterlyDatabase,
  subscriberSchema,
  subscriptionSchema,
} from './monsterly-db';

describe('Monsterly local RxDB database', () => {
  afterEach(async () => {
    await closeMonsterlyDatabase();
    indexedDB.deleteDatabase('monsterly-test');
  });

  it('initializes subscriber and subscription collections', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

    expect(db.subscribers).toBeDefined();
    expect(db.subscriptions).toBeDefined();
  });

  it('requires organization_id in organization-owned local schemas', () => {
    expect(subscriberSchema.required).toContain('organization_id');
    expect(subscriptionSchema.required).toContain('organization_id');
    expect(subscriberSchema.properties).not.toHaveProperty('owner_id');
    expect(subscriptionSchema.properties).not.toHaveProperty('owner_id');
  });

  it('supports basic local subscriber and subscription reads and writes', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

    await db.subscribers.insert({
      id: 'subscriber-1',
      organization_id: 'organization-1',
      name: 'Mariana Soto',
      gender: 'unspecified',
      phone_number: undefined,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: undefined,
    });

    await db.subscriptions.insert({
      id: 'subscription-1',
      organization_id: 'organization-1',
      subscriber_id: 'subscriber-1',
      kind: 'gym',
      billing_period: 'monthly',
      custom_days: undefined,
      start_date: '2026-07-01',
      paid_until_date: '2026-07-31',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: undefined,
    });

    const subscriber = await db.subscribers.findOne('subscriber-1').exec();
    const subscription = await db.subscriptions.findOne('subscription-1').exec();

    expect(subscriber?.name).toBe('Mariana Soto');
    expect(subscription?.subscriber_id).toBe('subscriber-1');

    await subscriber?.incrementalPatch({
      name: 'Mariana Soto Garcia',
      updated_at: '2026-07-02T00:00:00.000Z',
    });

    const updatedSubscriber = await db.subscribers.findOne('subscriber-1').exec();

    expect(updatedSubscriber?.name).toBe('Mariana Soto Garcia');
  });
});
