import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { RenewalDocument, SubscriptionDocument } from '@/lib/local-db/monsterly-db';

import type { DataModuleContext } from './data-layer-context';

export function watchSubscriptions({
  activeOrganizationId,
  db,
}: DataModuleContext): Observable<SubscriptionDocument[]> {
  return db.subscriptions
    .find({
      selector: {
        deleted_at: { $exists: false },
        organization_id: activeOrganizationId,
      },
      sort: [{ paid_until_date: 'asc' }],
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));
}

export async function listSubscriptions({
  activeOrganizationId,
  db,
}: DataModuleContext): Promise<SubscriptionDocument[]> {
  const documents = await db.subscriptions
    .find({
      selector: {
        deleted_at: { $exists: false },
        organization_id: activeOrganizationId,
      },
      sort: [{ paid_until_date: 'asc' }],
    })
    .exec();

  return documents.map((document) => document.toJSON());
}

export function watchRenewals({
  activeOrganizationId,
  db,
}: DataModuleContext): Observable<RenewalDocument[]> {
  return db.renewals
    .find({
      selector: {
        deleted_at: { $exists: false },
        organization_id: activeOrganizationId,
      },
      sort: [{ created_at: 'desc' }],
    })
    .$.pipe(map((documents) => documents.map((document) => document.toJSON())));
}

export async function listRenewals({
  activeOrganizationId,
  db,
}: DataModuleContext): Promise<RenewalDocument[]> {
  const documents = await db.renewals
    .find({
      selector: {
        deleted_at: { $exists: false },
        organization_id: activeOrganizationId,
      },
      sort: [{ created_at: 'desc' }],
    })
    .exec();

  return documents.map((document) => document.toJSON());
}
