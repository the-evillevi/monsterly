import type {
  MonsterlyDatabase,
  RenewalDocument,
  SubscriberDocument,
  SubscriptionDocument,
} from '@/lib/local-db/monsterly-db';

type OrganizationScoped = {
  activeOrganizationId: string;
};

export type SaveSubscriberInput = {
  gender?: SubscriberDocument['gender'];
  id: string;
  name: string;
  phone_number?: string;
};

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

export type SubscriberRepository = {
  list: () => Promise<SubscriberDocument[]>;
  save: (subscriber: SaveSubscriberInput) => Promise<SubscriberDocument>;
};

export type SubscriptionRepository = {
  list: () => Promise<SubscriptionDocument[]>;
  listRenewals: () => Promise<RenewalDocument[]>;
  recordRenewal: (renewal: SaveRenewalInput) => Promise<RenewalDocument>;
  save: (subscription: SaveSubscriptionInput) => Promise<SubscriptionDocument>;
};

export type MonsterlyRepositories = {
  subscribers: SubscriberRepository;
  subscriptions: SubscriptionRepository;
};

type CreateRxDbRepositoriesOptions = OrganizationScoped & {
  db: MonsterlyDatabase;
};

export function createRxDbRepositories({
  activeOrganizationId,
  db,
}: CreateRxDbRepositoriesOptions): MonsterlyRepositories {
  return {
    subscribers: new RxDbSubscriberRepository({ activeOrganizationId, db }),
    subscriptions: new RxDbSubscriptionRepository({ activeOrganizationId, db }),
  };
}

class RxDbSubscriberRepository implements SubscriberRepository {
  constructor(private readonly options: CreateRxDbRepositoriesOptions) {}

  async list() {
    const documents = await this.options.db.subscribers
      .find({
        selector: {
          deleted_at: { $exists: false },
          organization_id: this.options.activeOrganizationId,
        },
        sort: [{ name: 'asc' }],
      })
      .exec();

    return documents.map((document) => document.toJSON());
  }

  async save(input: SaveSubscriberInput) {
    const now = new Date().toISOString();
    const existing = await this.options.db.subscribers.findOne(input.id).exec();
    const subscriber = {
      _deleted: false,
      _modified: now,
      gender: input.gender ?? 'unspecified',
      id: input.id,
      name: input.name,
      organization_id: this.options.activeOrganizationId,
      phone_number: input.phone_number,
      updated_at: now,
    };

    if (existing) {
      await existing.incrementalPatch(subscriber);

      return { ...existing.toJSON(), ...subscriber };
    }

    const createdSubscriber: SubscriberDocument = {
      ...subscriber,
      created_at: now,
    };

    await this.options.db.subscribers.insert(createdSubscriber);

    return createdSubscriber;
  }
}

class RxDbSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly options: CreateRxDbRepositoriesOptions) {}

  async list() {
    const documents = await this.options.db.subscriptions
      .find({
        selector: {
          deleted_at: { $exists: false },
          organization_id: this.options.activeOrganizationId,
        },
        sort: [{ paid_until_date: 'asc' }],
      })
      .exec();

    return documents.map((document) => document.toJSON());
  }

  async save(input: SaveSubscriptionInput) {
    const now = new Date().toISOString();
    const existing = await this.options.db.subscriptions.findOne(input.id).exec();
    const subscription = {
      _deleted: false,
      _modified: now,
      billing_period: input.billing_period,
      custom_days: input.custom_days,
      id: input.id,
      kind: input.kind,
      organization_id: this.options.activeOrganizationId,
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

    await this.options.db.subscriptions.insert(createdSubscription);

    return createdSubscription;
  }

  async listRenewals() {
    const documents = await this.options.db.renewals
      .find({
        selector: {
          deleted_at: { $exists: false },
          organization_id: this.options.activeOrganizationId,
        },
        sort: [{ created_at: 'desc' }],
      })
      .exec();

    return documents.map((document) => document.toJSON());
  }

  async recordRenewal(input: SaveRenewalInput) {
    const now = new Date().toISOString();
    const renewal: RenewalDocument = {
      _deleted: false,
      _modified: now,
      created_at: now,
      id: input.id,
      new_paid_until_date: input.new_paid_until_date,
      organization_id: this.options.activeOrganizationId,
      previous_paid_until_date: input.previous_paid_until_date,
      subscription_id: input.subscription_id,
      updated_at: now,
    };

    await this.options.db.renewals.insert(renewal);

    return renewal;
  }
}
