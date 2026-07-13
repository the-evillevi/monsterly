import { duplicateScanWindowMinutes, isWithinDuplicateWindow } from '@/lib/domain/check-ins';
import { newEntityId } from '@/lib/domain/subscriber-identity';
import type { CheckInDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export type RecordCheckInInput = {
  now?: Date;
  subscriber_id: string;
};

export type RecordCheckInResult = {
  checkIn: CheckInDocument;
  /** True when the scan landed inside the duplicate window and the existing
   * check-in was returned instead of inserting a new one. */
  duplicate: boolean;
};

export async function recordCheckIn(
  { activeOrganizationId, db }: DataModuleContext,
  input: RecordCheckInInput,
): Promise<RecordCheckInResult> {
  const now = input.now ?? new Date();
  const subscriber = await db.subscribers
    .findOne({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        id: input.subscriber_id,
      },
    })
    .exec();

  if (!subscriber) {
    throw new Error('Subscriber must belong to the active organization.');
  }

  const windowStartIso = new Date(
    now.getTime() - duplicateScanWindowMinutes * 60_000,
  ).toISOString();
  const recentDocuments = await db.check_ins
    .find({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        checked_in_at: { $gte: windowStartIso },
        subscriber_id: input.subscriber_id,
      },
    })
    .exec();
  const latestRecent = recentDocuments
    .map((document) => document.toJSON())
    .filter((checkIn) => isWithinDuplicateWindow(checkIn.checked_in_at, now))
    .sort((left, right) => right.checked_in_at.localeCompare(left.checked_in_at))[0];

  if (latestRecent) {
    return { checkIn: latestRecent, duplicate: true };
  }

  const nowIso = now.toISOString();
  const checkIn: CheckInDocument = {
    _deleted: false,
    _modified: nowIso,
    checked_in_at: nowIso,
    created_at: nowIso,
    id: newEntityId(),
    organization_id: activeOrganizationId,
    subscriber_id: input.subscriber_id,
    updated_at: nowIso,
  };

  await db.check_ins.insert(checkIn);

  return { checkIn, duplicate: false };
}
