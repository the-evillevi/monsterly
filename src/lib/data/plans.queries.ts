import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { PlanDocument } from '@/lib/local-db/monsterly-db';

import { activeRecordSelector } from './active-records';
import type { DataModuleContext } from './data-layer-context';

function byPriceThenName(left: PlanDocument, right: PlanDocument) {
  return left.price - right.price || left.name.localeCompare(right.name);
}

/**
 * Every non-archived plan of the organization, grandfathered ones included —
 * legacy subscriptions still reference them for facility badges.
 */
export function watchPlans(context: DataModuleContext): Observable<PlanDocument[]> {
  return (
    context.db.plans
      .find({
        selector: {
          ...activeRecordSelector(context.activeOrganizationId),
        },
      })
      // Sorted in memory: the catalog is a handful of rows and price is not an
      // indexed field.
      .$.pipe(
        map((documents) => documents.map((document) => document.toJSON()).sort(byPriceThenName)),
      )
  );
}

/** The plans offered at registration ("alta"): active catalog entries only. */
export function watchActivePlans(context: DataModuleContext): Observable<PlanDocument[]> {
  return watchPlans(context).pipe(map((plans) => plans.filter((plan) => plan.active)));
}

export async function listPlans(context: DataModuleContext): Promise<PlanDocument[]> {
  const documents = await context.db.plans
    .find({
      selector: {
        ...activeRecordSelector(context.activeOrganizationId),
      },
    })
    .exec();

  return documents.map((document) => document.toJSON()).sort(byPriceThenName);
}
