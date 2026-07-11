import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { attachPushConflictRecovery, extractUniqueViolation } from './push-conflict-recovery';
import type { SyncReplicationState } from './types';

function postgrestUniqueViolation(field: 'slug' | 'check_in_code', value: string) {
  return {
    code: '23505',
    details: `Key (${field})=(${value}) already exists.`,
    hint: null,
    message: `duplicate key value violates unique constraint "subscribers_${field}_key"`,
  };
}

function createErrorSubject() {
  const listeners = new Set<(error: unknown) => void>();

  return {
    emit: (error: unknown) => listeners.forEach((listener) => listener(error)),
    observable: {
      subscribe: (listener: (error: unknown) => void) => {
        listeners.add(listener);

        return { unsubscribe: () => listeners.delete(listener) };
      },
    },
  };
}

function createReplicationStub(errorObservable: SyncReplicationState['error$']) {
  return {
    active$: { subscribe: () => ({ unsubscribe: () => undefined }) },
    cancel: vi.fn(),
    error$: errorObservable,
    reSync: vi.fn(),
  } satisfies SyncReplicationState;
}

describe('extractUniqueViolation', () => {
  it('reads the field and colliding value from a PostgREST unique violation', () => {
    expect(extractUniqueViolation(postgrestUniqueViolation('slug', 'ana-torres-x2k4'))).toEqual({
      field: 'slug',
      value: 'ana-torres-x2k4',
    });
    expect(extractUniqueViolation(postgrestUniqueViolation('check_in_code', '482913'))).toEqual({
      field: 'check_in_code',
      value: '482913',
    });
  });

  it('unwraps RxDB error nesting to find the violation', () => {
    const rxError = {
      message: 'RxError (RC_PUSH): could not push documents',
      parameters: {
        errors: [
          {
            cause: postgrestUniqueViolation('slug', 'ana-torres-x2k4'),
            message: 'push failed',
          },
        ],
      },
    };

    expect(extractUniqueViolation(rxError)).toEqual({ field: 'slug', value: 'ana-torres-x2k4' });
  });

  it('falls back to the constraint name when the detail line is missing', () => {
    const violation = extractUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "subscribers_check_in_code_key"',
    });

    expect(violation).toEqual({ field: 'check_in_code', value: null });
  });

  it('ignores non-unique-violation errors and foreign constraints', () => {
    expect(extractUniqueViolation(new Error('fetch failed'))).toBeNull();
    expect(extractUniqueViolation({ code: '23503', message: 'foreign key violation' })).toBeNull();
    expect(
      extractUniqueViolation({
        code: '23505',
        details: 'Key (id)=(abc) already exists.',
        message: 'duplicate key value violates unique constraint "subscribers_pkey"',
      }),
    ).toBeNull();
  });
});

describe('attachPushConflictRecovery', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('regenerates a rejected slug and resyncs, keeping id and PIN stable', async () => {
    const context = await createTestDataContext();
    const created = await saveSubscriber(context, { name: 'Ana', paternal_last_name: 'Torres' });
    const subject = createErrorSubject();
    const replication = createReplicationStub(subject.observable);

    const recovery = attachPushConflictRecovery(replication, context.db);

    subject.emit(postgrestUniqueViolation('slug', created.slug ?? ''));

    await vi.waitFor(async () => {
      const doc = await context.db.subscribers.findOne(created.id).exec();

      expect(doc?.slug).not.toBe(created.slug);
    });

    const doc = await context.db.subscribers.findOne(created.id).exec();
    expect(doc?.slug).toMatch(/^ana-torres-[a-z2-9]{4}$/);
    expect(doc?.check_in_code).toBe(created.check_in_code);
    expect(replication.reSync).toHaveBeenCalledTimes(1);

    recovery.unsubscribe();
  });

  it('regenerates a rejected check-in code without touching the slug', async () => {
    const context = await createTestDataContext();
    const created = await saveSubscriber(context, { name: 'Ana', paternal_last_name: 'Torres' });
    const subject = createErrorSubject();
    const replication = createReplicationStub(subject.observable);

    const recovery = attachPushConflictRecovery(replication, context.db);

    subject.emit(postgrestUniqueViolation('check_in_code', created.check_in_code ?? ''));

    await vi.waitFor(async () => {
      const doc = await context.db.subscribers.findOne(created.id).exec();

      expect(doc?.check_in_code).not.toBe(created.check_in_code);
    });

    const doc = await context.db.subscribers.findOne(created.id).exec();
    expect(doc?.check_in_code).toMatch(/^[1-9][0-9]{5}$/);
    expect(doc?.slug).toBe(created.slug);
    expect(replication.reSync).toHaveBeenCalledTimes(1);

    recovery.unsubscribe();
  });

  it('ignores violations for values no local document holds', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { name: 'Ana', paternal_last_name: 'Torres' });
    const subject = createErrorSubject();
    const replication = createReplicationStub(subject.observable);

    const recovery = attachPushConflictRecovery(replication, context.db);

    subject.emit(postgrestUniqueViolation('slug', 'someone-elses-slug-abcd'));

    // Give the async handler a beat; nothing should change.
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));

    expect(replication.reSync).not.toHaveBeenCalled();

    recovery.unsubscribe();
  });

  it('stops recovering after unsubscribe', async () => {
    const context = await createTestDataContext();
    const created = await saveSubscriber(context, { name: 'Ana', paternal_last_name: 'Torres' });
    const subject = createErrorSubject();
    const replication = createReplicationStub(subject.observable);

    attachPushConflictRecovery(replication, context.db).unsubscribe();

    subject.emit(postgrestUniqueViolation('slug', created.slug ?? ''));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));

    const doc = await context.db.subscribers.findOne(created.id).exec();
    expect(doc?.slug).toBe(created.slug);
    expect(replication.reSync).not.toHaveBeenCalled();
  });
});
