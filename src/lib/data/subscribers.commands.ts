import { isValidPhoneNumber } from '@/lib/domain/phone-number';
import {
  formatFullName,
  generateCheckInCode,
  generateSlug,
  newEntityId,
} from '@/lib/domain/subscriber-identity';
import type { MonsterlyDatabase, SubscriberDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';

export type SaveSubscriberInput = {
  gender?: SubscriberDocument['gender'];
  id?: string;
  maternal_last_name?: string;
  name: string;
  paternal_last_name?: string;
  phone_number?: string;
};

const uniquenessAttempts = 5;

// Local uniqueness check with regenerate-and-retry; the global Postgres unique
// indexes are the multi-device backstop.
async function generateUnique(
  db: MonsterlyDatabase,
  field: 'slug' | 'check_in_code',
  generate: () => string,
) {
  for (let attempt = 0; attempt < uniquenessAttempts; attempt += 1) {
    const candidate = generate();
    const taken = await db.subscribers.findOne({ selector: { [field]: candidate } }).exec();

    if (!taken) {
      return candidate;
    }
  }

  throw new Error(`Could not generate a unique subscriber ${field}.`);
}

export async function saveSubscriber(
  { activeOrganizationId, db }: DataModuleContext,
  input: SaveSubscriberInput,
) {
  const name = input.name.trim();
  const paternalLastName = input.paternal_last_name?.trim() || null;
  const maternalLastName = input.maternal_last_name?.trim() || null;

  if (!name) {
    throw new Error('Subscriber name is required.');
  }

  if (input.phone_number && !isValidPhoneNumber(input.phone_number)) {
    throw new Error('Subscriber phone number must have 10 to 15 digits.');
  }

  const now = new Date().toISOString();
  const existing = input.id
    ? await db.subscribers
        .findOne({
          selector: {
            id: input.id,
            organization_id: activeOrganizationId,
          },
        })
        .exec()
    : null;
  const fullName = formatFullName({
    maternal_last_name: maternalLastName,
    name,
    paternal_last_name: paternalLastName,
  });
  const subscriber = {
    _deleted: false,
    _modified: now,
    gender: input.gender ?? 'unspecified',
    id: input.id ?? newEntityId(),
    maternal_last_name: maternalLastName,
    name,
    organization_id: activeOrganizationId,
    paternal_last_name: paternalLastName,
    // null, not undefined: an undefined field in incrementalPatch leaves the
    // stored value untouched, so clearing a phone number would silently no-op.
    phone_number: input.phone_number ?? null,
    updated_at: now,
  };

  if (existing) {
    // A rename regenerates the slug (routing-only, nothing binds to it); the
    // id and check_in_code stay stable for life. When the name is unchanged
    // the slug field is left out of the patch entirely: pre-backfill docs
    // have no slug yet and generating one here would diverge from the value
    // the server-side backfill already assigned.
    const nameChanged = formatFullName(existing.toJSON()) !== fullName;
    const patched = await existing.incrementalPatch(
      nameChanged
        ? { ...subscriber, slug: await generateUnique(db, 'slug', () => generateSlug(fullName)) }
        : subscriber,
    );

    return patched.toJSON();
  }

  const [check_in_code, slug] = await Promise.all([
    generateUnique(db, 'check_in_code', generateCheckInCode),
    generateUnique(db, 'slug', () => generateSlug(fullName)),
  ]);
  const createdSubscriber: SubscriberDocument = {
    ...subscriber,
    check_in_code,
    created_at: now,
    slug,
  };

  await db.subscribers.insert(createdSubscriber);

  return createdSubscriber;
}

export async function archiveSubscriber(
  { activeOrganizationId, db }: DataModuleContext,
  id: string,
) {
  const existing = await db.subscribers
    .findOne({
      selector: {
        id,
        organization_id: activeOrganizationId,
      },
    })
    .exec();

  if (!existing) {
    throw new Error('Subscriber must belong to the active organization.');
  }

  const now = new Date().toISOString();

  // deleted_at is the archive marker; _deleted stays false on purpose. Setting
  // _deleted would make RxDB purge the document and replicate a hard delete,
  // while deleted_at keeps the row replicating to Supabase as audit history.
  await existing.incrementalPatch({
    _modified: now,
    deleted_at: now,
    updated_at: now,
  });
}
