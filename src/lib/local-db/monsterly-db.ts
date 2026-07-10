import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

addRxPlugin(RxDBMigrationSchemaPlugin);

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

export const subscriberGenders = ['female', 'male', 'non_binary', 'unspecified'] as const;

export type SubscriberGender = (typeof subscriberGenders)[number];

export const subscriptionKinds = ['gym', 'crossfit'] as const;

export type SubscriptionKind = (typeof subscriptionKinds)[number];

export const billingPeriods = [
  'weekly',
  'monthly',
  'bimonthly',
  'six_monthly',
  'yearly',
  'custom',
] as const;

export type BillingPeriod = (typeof billingPeriods)[number];

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
    gender: { type: 'string', enum: subscriberGenders },
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
  version: 1,
  primaryKey: 'id',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    organization_id: { type: 'string', maxLength: 100 },
    subscriber_id: { type: 'string', maxLength: 100 },
    kind: { type: 'string', enum: subscriptionKinds },
    billing_period: {
      type: 'string',
      enum: billingPeriods,
    },
    custom_days: { type: ['integer', 'null'], minimum: 1 },
    plan_name: { type: ['string', 'null'], maxLength: 200 },
    price: { type: ['number', 'null'], minimum: 0 },
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
  deleted_at?: string | null;
  gender: SubscriberGender;
  id: string;
  name: string;
  organization_id: string;
  phone_number?: string | null;
  updated_at: string;
};

export type SubscriptionDocument = {
  _deleted: boolean;
  _modified: string;
  billing_period: BillingPeriod;
  created_at: string;
  custom_days?: number | null;
  deleted_at?: string | null;
  id: string;
  kind: SubscriptionKind;
  organization_id: string;
  paid_until_date: string;
  plan_name?: string | null;
  price?: number | null;
  start_date: string;
  subscriber_id: string;
  updated_at: string;
};

export type RenewalDocument = {
  _deleted: boolean;
  _modified: string;
  created_at: string;
  deleted_at?: string | null;
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
let databaseName: string | undefined;

export async function getMonsterlyDatabase({
  name = 'monsterly',
}: GetMonsterlyDatabaseOptions = {}): Promise<MonsterlyDatabase> {
  if (databasePromise && databaseName !== name) {
    throw new Error(
      `Local database is already open as "${databaseName}"; close it before opening "${name}".`,
    );
  }

  databaseName = name;
  databasePromise ??= createMonsterlyDatabase(name);

  return databasePromise;
}

export async function closeMonsterlyDatabase() {
  const database = await databasePromise;
  databasePromise = undefined;
  databaseName = undefined;

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
      migrationStrategies: {
        // v0 -> v1 adds the optional plan_name/price fields; existing rows need
        // no transformation, so upgrade them in place untouched.
        1: (oldDocument) => oldDocument,
      },
    },
  });

  return database;
}
