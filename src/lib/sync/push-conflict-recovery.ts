import { generateUnique } from '@/lib/data/subscribers.commands';
import {
  formatFullName,
  generateCheckInCode,
  generateSlug,
} from '@/lib/domain/subscriber-identity';
import type { MonsterlyDatabase } from '@/lib/local-db/monsterly-db';

import type { SyncReplicationState } from './types';

// Subscriber slugs and check-in PINs are generated client-side and validated
// only against the local database; the global Postgres unique indexes are the
// multi-device backstop. Without recovery, a cross-device collision would make
// RxDB re-push the same rejected document every retryTime forever, wedging
// sync for the collection. This module closes that loop: detect the unique
// violation, regenerate the colliding value locally, and resume replication.

const uniqueFields = ['slug', 'check_in_code'] as const;

type UniqueField = (typeof uniqueFields)[number];

export type UniqueViolation = {
  field: UniqueField;
  value: string | null;
};

function isUniqueField(value: string): value is UniqueField {
  return (uniqueFields as readonly string[]).includes(value);
}

/**
 * Walk an error and its RxDB/supabase-js wrappings looking for a Postgres
 * unique violation on a subscriber identity column. The colliding value comes
 * from the Postgres detail line (`Key (slug)=(x) already exists.`); when only
 * the constraint name is present the field is still reported so callers can
 * at least log something actionable.
 */
export function extractUniqueViolation(error: unknown): UniqueViolation | null {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const candidate = queue.shift();

    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);

    const record = candidate as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : '';
    const details = typeof record.details === 'string' ? record.details : '';
    const isUniqueViolation =
      record.code === '23505' || message.includes('duplicate key value violates unique constraint');

    if (isUniqueViolation) {
      const detailMatch = details.match(/Key \(([a-z_]+)\)=\((.+)\) already exists/);

      if (detailMatch && isUniqueField(detailMatch[1])) {
        return { field: detailMatch[1], value: detailMatch[2] };
      }

      const constraintMatch = message.match(/subscribers_([a-z_]+)_key/);

      if (constraintMatch && isUniqueField(constraintMatch[1])) {
        return { field: constraintMatch[1], value: null };
      }
    }

    // RxDB wraps handler errors in RxError.parameters.errors; supabase-js and
    // fetch wrap causes. Follow all of them.
    const parameters = record.parameters as Record<string, unknown> | undefined;

    if (Array.isArray(parameters?.errors)) {
      queue.push(...parameters.errors);
    }
    queue.push(record.error, record.cause);
  }

  return null;
}

/**
 * Regenerate-and-retry on push conflict: when the server rejects a subscriber
 * for a duplicate slug/check_in_code, mint a fresh value for the local doc
 * (unique against the local DB, like any other save) and resync so the
 * corrected document replaces the rejected one in the push queue.
 */
export function attachPushConflictRecovery(
  replication: SyncReplicationState,
  db: MonsterlyDatabase,
) {
  let recovering = false;

  async function recover(error: unknown) {
    const violation = extractUniqueViolation(error);

    if (!violation || recovering) {
      return;
    }

    if (!violation.value) {
      console.error(
        `Subscriber ${violation.field} was rejected as duplicate, but the conflicting value ` +
          'is unknown; sync will keep retrying.',
      );
      return;
    }

    recovering = true;

    try {
      const doc = await db.subscribers
        .findOne({ selector: { [violation.field]: violation.value } })
        .exec();

      if (!doc) {
        return;
      }

      const replacement =
        violation.field === 'slug'
          ? await generateUnique(db, 'slug', () => generateSlug(formatFullName(doc.toJSON())))
          : await generateUnique(db, 'check_in_code', generateCheckInCode);
      const now = new Date().toISOString();

      await doc.incrementalPatch({
        ...(violation.field === 'slug' ? { slug: replacement } : { check_in_code: replacement }),
        _modified: now,
        updated_at: now,
      });

      replication.reSync?.();
    } finally {
      recovering = false;
    }
  }

  const subscription = replication.error$.subscribe((error) => {
    void recover(error);
  });

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
}
