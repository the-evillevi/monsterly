import { isValidPhoneNumber } from '@/lib/domain/phone-number';
import type { SubscriberDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';

export type SaveSubscriberInput = {
  gender?: SubscriberDocument['gender'];
  id?: string;
  name: string;
  phone_number?: string;
};

export async function saveSubscriber(
  { activeOrganizationId, db }: DataModuleContext,
  input: SaveSubscriberInput,
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Subscriber name is required.');
  }

  if (input.phone_number && !isValidPhoneNumber(input.phone_number)) {
    throw new Error('Subscriber phone number must have 10 to 15 digits.');
  }

  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const existing = input.id
    ? await db.subscribers
        .findOne({
          selector: {
            id,
            organization_id: activeOrganizationId,
          },
        })
        .exec()
    : null;
  const subscriber = {
    _deleted: false,
    _modified: now,
    gender: input.gender ?? 'unspecified',
    id,
    name,
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
