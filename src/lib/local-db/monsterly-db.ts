import { createRxDatabase, type RxCollection, type RxDatabase, type RxJsonSchema } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const timestampSchema = {
  type: 'string',
  format: 'date-time',
  maxLength: 32,
} as const;

const dateSchema = {
  type: 'string',
  format: 'date',
  maxLength: 10,
} as const;

const optionalTimestampSchema = {
  anyOf: [timestampSchema, { type: 'null' }],
} as const;

export const subscriberSchemaLiteral = {
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
    created_at: timestampSchema,
    updated_at: timestampSchema,
    deleted_at: optionalTimestampSchema,
    _deleted: { type: 'boolean' },
    _modified: timestampSchema,
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

export const subscriptionSchemaLiteral = {
  title: 'subscription schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    organization_id: { type: 'string', maxLength: 100 },
    subscriber_id: { type: 'string', maxLength: 100 },
    kind: { type: 'string', enum: ['gym', 'crossfit'] },
    billing_period: {
      type: 'string',
      enum: ['weekly', 'monthly', 'bimonthly', 'six_monthly', 'yearly', 'custom'],
    },
    custom_days: { type: ['integer', 'null'], minimum: 1 },
    start_date: dateSchema,
    paid_until_date: dateSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    deleted_at: optionalTimestampSchema,
    _deleted: { type: 'boolean' },
    _modified: timestampSchema,
  },
  required: [
    'id',
    'organization_id',
    'subscriber_id',
    'kind',
    'billing_period',
    'start_date',
    'paid_until_date',
    'created_at',
    'updated_at',
    '_deleted',
    '_modified',
  ],
  indexes: [
    ['organization_id', 'paid_until_date'],
    ['organization_id', 'subscriber_id'],
    ['organization_id', 'updated_at'],
  ],
} as const;

export const renewalSchemaLiteral = {
  title: 'renewal schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    organization_id: { type: 'string', maxLength: 100 },
    subscription_id: { type: 'string', maxLength: 100 },
    previous_paid_until_date: dateSchema,
    new_paid_until_date: dateSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    deleted_at: optionalTimestampSchema,
    _deleted: { type: 'boolean' },
    _modified: timestampSchema,
  },
  required: [
    'id',
    'organization_id',
    'subscription_id',
    'previous_paid_until_date',
    'new_paid_until_date',
    'created_at',
    'updated_at',
    '_deleted',
    '_modified',
  ],
  indexes: [
    ['organization_id', 'created_at'],
    ['organization_id', 'subscription_id'],
    ['organization_id', 'updated_at'],
  ],
} as const;

export type SubscriberDocument = {
  _deleted: boolean;
  _modified: string;
  created_at: string;
  deleted_at?: string;
  gender: 'female' | 'male' | 'non_binary' | 'unspecified';
  id: string;
  name: string;
  organization_id: string;
  phone_number?: string;
  updated_at: string;
};

export type SubscriptionDocument = {
  _deleted: boolean;
  _modified: string;
  billing_period: 'weekly' | 'monthly' | 'bimonthly' | 'six_monthly' | 'yearly' | 'custom';
  created_at: string;
  custom_days?: number;
  deleted_at?: string;
  id: string;
  kind: 'gym' | 'crossfit';
  organization_id: string;
  paid_until_date: string;
  start_date: string;
  subscriber_id: string;
  updated_at: string;
};

export type RenewalDocument = {
  _deleted: boolean;
  _modified: string;
  created_at: string;
  deleted_at?: string;
  id: string;
  new_paid_until_date: string;
  organization_id: string;
  previous_paid_until_date: string;
  subscription_id: string;
  updated_at: string;
};

export const subscriberSchema: RxJsonSchema<SubscriberDocument> = subscriberSchemaLiteral;
export const subscriptionSchema: RxJsonSchema<SubscriptionDocument> = subscriptionSchemaLiteral;
export const renewalSchema: RxJsonSchema<RenewalDocument> = renewalSchemaLiteral;

export type MonsterlyCollections = {
  renewals: RxCollection<RenewalDocument>;
  subscribers: RxCollection<SubscriberDocument>;
  subscriptions: RxCollection<SubscriptionDocument>;
};

export type MonsterlyDatabase = RxDatabase<MonsterlyCollections>;

type GetMonsterlyDatabaseOptions = {
  name?: string;
};

let databasePromise: Promise<MonsterlyDatabase> | undefined;

export async function getMonsterlyDatabase({
  name = 'monsterly',
}: GetMonsterlyDatabaseOptions = {}): Promise<MonsterlyDatabase> {
  databasePromise ??= createMonsterlyDatabase(name);

  return databasePromise;
}

export async function closeMonsterlyDatabase() {
  const database = await databasePromise;
  databasePromise = undefined;

  await database?.remove();
}

async function createMonsterlyDatabase(name: string): Promise<MonsterlyDatabase> {
  const database = await createRxDatabase<MonsterlyCollections>({
    name,
    storage: getRxStorageDexie(),
    multiInstance: false,
  });

  await database.addCollections({
    renewals: {
      schema: renewalSchema,
    },
    subscribers: {
      schema: subscriberSchema,
    },
    subscriptions: {
      schema: subscriptionSchema,
    },
  });

  return database;
}
