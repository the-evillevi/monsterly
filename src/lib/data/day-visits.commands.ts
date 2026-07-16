import { getDayVisitOption } from '@/lib/domain/day-visits';
import { todayDateOnly } from '@/lib/domain/date-only';
import { newEntityId } from '@/lib/domain/subscriber-identity';
import type { DayVisitDocument, DayVisitType } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export type RecordDayVisitInput = {
  now?: Date;
  subscriber_id?: string | null;
  visit_type: DayVisitType;
};

export async function recordDayVisit(
  { activeOrganizationId, db }: DataModuleContext,
  input: RecordDayVisitInput,
): Promise<DayVisitDocument> {
  const option = getDayVisitOption(input.visit_type);

  if (input.subscriber_id) {
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
  }

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const dayVisit: DayVisitDocument = {
    _deleted: false,
    _modified: nowIso,
    created_at: nowIso,
    id: newEntityId(),
    organization_id: activeOrganizationId,
    price: option.price,
    subscriber_id: input.subscriber_id ?? null,
    updated_at: nowIso,
    visit_date: todayDateOnly(now),
    visit_type: option.type,
  };

  await db.day_visits.insert(dayVisit);

  return dayVisit;
}

export async function archiveDayVisit({ activeOrganizationId, db }: DataModuleContext, id: string) {
  const existing = await db.day_visits
    .findOne({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
        id,
      },
    })
    .exec();

  if (!existing) {
    throw new Error('Day visit must belong to the active organization.');
  }

  const now = new Date().toISOString();

  await existing.incrementalPatch({
    _modified: now,
    deleted_at: now,
    updated_at: now,
  });
}
