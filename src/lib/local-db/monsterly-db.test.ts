import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeMonsterlyDatabase,
  getMonsterlyDatabase,
  subscriberSchema,
  subscriptionSchema,
  type MonsterlyCollections,
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
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
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
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
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

  it('stores optional plan_name and price on subscriptions', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

    await db.subscribers.insert({
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
      id: 'subscriber-2',
      organization_id: 'organization-1',
      name: 'Carlos Perez',
      gender: 'unspecified',
      phone_number: undefined,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: undefined,
    });

    await db.subscriptions.insert({
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
      id: 'subscription-2',
      organization_id: 'organization-1',
      subscriber_id: 'subscriber-2',
      kind: 'gym',
      billing_period: 'monthly',
      custom_days: undefined,
      plan_name: 'Regular',
      price: 450,
      start_date: '2026-07-01',
      paid_until_date: '2026-07-31',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: undefined,
    });

    const subscription = await db.subscriptions.findOne('subscription-2').exec();

    expect(subscription?.plan_name).toBe('Regular');
    expect(subscription?.price).toBe(450);
  });

  it('stores the identity tiers and split last names on subscribers', async () => {
    const db = await getMonsterlyDatabase({ name: 'monsterly-test' });

    await db.subscribers.insert({
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
      id: '019f4d3f-1b56-72f7-a22b-97c3125488f0',
      organization_id: 'organization-1',
      name: 'Dulce',
      paternal_last_name: 'Palomino',
      maternal_last_name: 'García',
      slug: 'dulce-palomino-garcia-4x2b',
      check_in_code: '482913',
      gender: 'female',
      phone_number: undefined,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: undefined,
    });

    const subscriber = await db.subscribers
      .findOne('019f4d3f-1b56-72f7-a22b-97c3125488f0')
      .exec();

    expect(subscriber?.slug).toBe('dulce-palomino-garcia-4x2b');
    expect(subscriber?.check_in_code).toBe('482913');
    expect(subscriber?.paternal_last_name).toBe('Palomino');
    expect(subscriber?.maternal_last_name).toBe('García');
  });

  it('migrates v0 subscriber documents to v1 in place', async () => {
    const databaseName = 'monsterly-migration-test';
    const subscriberSchemaV0 = {
      title: 'subscriber schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', maxLength: 100 },
        organization_id: { type: 'string', maxLength: 100 },
        name: { type: 'string', maxLength: 200 },
        gender: { type: 'string', enum: ['female', 'male', 'non_binary', 'unspecified'] },
        phone_number: { type: ['string', 'null'], maxLength: 40 },
        created_at: { type: 'string', format: 'date-time', maxLength: 32 },
        updated_at: { type: 'string', format: 'date-time', maxLength: 32 },
        deleted_at: {
          anyOf: [{ type: 'string', format: 'date-time', maxLength: 32 }, { type: 'null' }],
        },
        _deleted: { type: 'boolean' },
        _modified: { type: 'string', format: 'date-time', maxLength: 32 },
      },
      required: [
        'id',
        'organization_id',
        'name',
        'gender',
        'created_at',
        'updated_at',
        '_deleted',
        '_modified',
      ],
      indexes: [
        ['organization_id', 'name'],
        ['organization_id', 'updated_at'],
      ],
    } as const;

    const v0Database = await createRxDatabase<Pick<MonsterlyCollections, 'subscribers'>>({
      name: databaseName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });

    await v0Database.addCollections({
      // @ts-expect-error the v0 literal intentionally lacks the v1 fields
      subscribers: { schema: subscriberSchemaV0 },
    });

    await v0Database.subscribers.insert({
      _deleted: false,
      _modified: '2026-07-01T00:00:00.000Z',
      id: 'legacy-subscriber',
      organization_id: 'organization-1',
      name: 'Mariana Soto',
      gender: 'unspecified',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    await v0Database.close();

    const v1Database = await createRxDatabase<Pick<MonsterlyCollections, 'subscribers'>>({
      name: databaseName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });

    try {
      await v1Database.addCollections({
        subscribers: {
          schema: subscriberSchema,
          migrationStrategies: {
            1: (oldDocument) => oldDocument,
          },
        },
      });

      const migrated = await v1Database.subscribers.findOne('legacy-subscriber').exec();

      expect(migrated?.name).toBe('Mariana Soto');
      expect(migrated?.slug).toBeFalsy();
      expect(migrated?.check_in_code).toBeFalsy();
    } finally {
      await v1Database.remove();
    }
  });
});
