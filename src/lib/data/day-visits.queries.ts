import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { DayVisitDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export function watchDayVisits({
  activeOrganizationId,
  db,
}: DataModuleContext): Observable<DayVisitDocument[]> {
  return db.day_visits
    .find({
      selector: activeRecordSelector(activeOrganizationId),
      sort: [{ visit_date: 'desc' }],
    })
    .$.pipe(
      map((documents) =>
        documents
          .map((document) => document.toJSON())
          .sort(
            (left, right) =>
              right.visit_date.localeCompare(left.visit_date) ||
              right.created_at.localeCompare(left.created_at),
          ),
      ),
    );
}

export function watchSubscriberDayVisits(
  context: DataModuleContext,
  subscriberId: string,
): Observable<DayVisitDocument[]> {
  return watchDayVisits(context).pipe(
    map((visits) => visits.filter((visit) => visit.subscriber_id === subscriberId)),
  );
}

export async function listDayVisits({
  activeOrganizationId,
  db,
}: DataModuleContext): Promise<DayVisitDocument[]> {
  const documents = await db.day_visits
    .find({
      selector: activeRecordSelector(activeOrganizationId),
      sort: [{ visit_date: 'desc' }],
    })
    .exec();

  return documents
    .map((document) => document.toJSON())
    .sort(
      (left, right) =>
        right.visit_date.localeCompare(left.visit_date) ||
        right.created_at.localeCompare(left.created_at),
    );
}
