import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { CheckInDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

export function watchCheckIns({
  activeOrganizationId,
  db,
}: DataModuleContext): Observable<CheckInDocument[]> {
  return db.check_ins
    .find({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
      },
      sort: [{ checked_in_at: 'desc' }],
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));
}

export function watchRecentCheckIns(
  context: DataModuleContext,
  limit = 10,
): Observable<CheckInDocument[]> {
  return context.db.check_ins
    .find({
      selector: {
        ...activeRecordSelector(context.activeOrganizationId),
      },
      sort: [{ checked_in_at: 'desc' }],
      limit,
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));
}

export async function listCheckIns({
  activeOrganizationId,
  db,
}: DataModuleContext): Promise<CheckInDocument[]> {
  const documents = await db.check_ins
    .find({
      selector: {
        ...activeRecordSelector(activeOrganizationId),
      },
      sort: [{ checked_in_at: 'desc' }],
    })
    .exec();

  return documents.map((document) => document.toJSON());
}
