import type { SubscriberDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';

export type SaveSubscriberInput = {
  gender?: SubscriberDocument['gender'];
  id: string;
  name: string;
  phone_number?: string;
};

export async function saveSubscriber(
  { activeOrganizationId, db }: DataModuleContext,
  input: SaveSubscriberInput,
) {
  const now = new Date().toISOString();
  const existing = await db.subscribers
    .findOne({
      selector: {
        id: input.id,
        organization_id: activeOrganizationId,
      },
    })
    .exec();
  const subscriber = {
    _deleted: false,
    _modified: now,
    gender: input.gender ?? 'unspecified',
    id: input.id,
    name: input.name,
    organization_id: activeOrganizationId,
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

  await db.subscribers.insert(createdSubscriber);

  return createdSubscriber;
}
