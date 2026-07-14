import { afterEach, describe, expect, it } from 'vitest';

import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';
import { formatDateOnly } from '@/lib/domain/date-only';

import { ExpiredSubscriberCheckInError, recordCheckIn } from './check-ins.commands';
import { listCheckIns } from './check-ins.queries';
import { saveSubscriber } from './subscribers.commands';
import { findSubscriberByCheckInCode } from './subscribers.queries';
import { saveSubscription } from './subscriptions.commands';

describe('check-ins data layer', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('records a check-in for an organization member', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    const { checkIn, duplicate } = await recordCheckIn(context, { subscriber_id: 'subscriber-1' });

    expect(duplicate).toBe(false);
    expect(checkIn.subscriber_id).toBe('subscriber-1');
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });

  it('returns the existing check-in for a rescan inside the duplicate window', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    const first = await recordCheckIn(context, { subscriber_id: 'subscriber-1' });
    const second = await recordCheckIn(context, { subscriber_id: 'subscriber-1' });

    expect(second.duplicate).toBe(true);
    expect(second.checkIn.id).toBe(first.checkIn.id);
    await expect(listCheckIns(context)).resolves.toHaveLength(1);
  });

  it('records a fresh visit once the duplicate window has passed', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    const morning = new Date('2026-07-13T08:00:00.000Z');
    const evening = new Date('2026-07-13T18:00:00.000Z');
    await recordCheckIn(context, { now: morning, subscriber_id: 'subscriber-1' });
    const returnVisit = await recordCheckIn(context, {
      now: evening,
      subscriber_id: 'subscriber-1',
    });

    expect(returnVisit.duplicate).toBe(false);
    await expect(listCheckIns(context)).resolves.toHaveLength(2);
  });

  it('deduplicates per member, not across the whole desk', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    await saveSubscriber(context, { id: 'subscriber-2', name: 'Luis Vega' });

    await recordCheckIn(context, { subscriber_id: 'subscriber-1' });
    const other = await recordCheckIn(context, { subscriber_id: 'subscriber-2' });

    expect(other.duplicate).toBe(false);
    await expect(listCheckIns(context)).resolves.toHaveLength(2);
  });

  it('rejects members outside the active organization', async () => {
    const context = await createTestDataContext();

    await expect(recordCheckIn(context, { subscriber_id: 'missing' })).rejects.toThrow(
      'Subscriber must belong to the active organization.',
    );
  });

  it('rejects expired members without writing a check-in', async () => {
    const context = await createTestDataContext();
    const subscriber = await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await saveSubscription(context, {
      billing_period: 'monthly',
      id: 'subscription-1',
      kind: 'gym',
      paid_until_date: formatDateOnly(yesterday),
      start_date: '2026-01-01',
      subscriber_id: subscriber.id,
    });

    await expect(recordCheckIn(context, { subscriber_id: subscriber.id })).rejects.toBeInstanceOf(
      ExpiredSubscriberCheckInError,
    );
    await expect(listCheckIns(context)).resolves.toHaveLength(0);
  });

  it('resolves a subscriber from their check-in code', async () => {
    const context = await createTestDataContext();
    const saved = await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    expect(saved.check_in_code).toBeTruthy();
    const found = await findSubscriberByCheckInCode(context, saved.check_in_code!);
    expect(found?.id).toBe('subscriber-1');

    await expect(findSubscriberByCheckInCode(context, '000000')).resolves.toBeNull();
  });
});
