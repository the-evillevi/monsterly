import { afterEach, describe, expect, it } from 'vitest';

import { saveSubscriber } from '@/lib/data/subscribers.commands';
import { cleanupTestDatabase, createTestDataContext } from '@/test/test-data-layer';

import { archiveDayVisit, recordDayVisit } from './day-visits.commands';
import { listDayVisits } from './day-visits.queries';

describe('day visits data layer', () => {
  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('records fixed price snapshots on the local calendar day', async () => {
    const context = await createTestDataContext();
    const now = new Date('2026-07-15T18:30:00.000Z');

    await recordDayVisit(context, { now, visit_type: 'gym' });
    await recordDayVisit(context, { now, visit_type: 'crossfit' });
    await recordDayVisit(context, { now, visit_type: 'both' });

    const visits = await listDayVisits(context);
    expect(visits).toHaveLength(3);
    expect(visits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          price: 80,
          subscriber_id: null,
          visit_date: '2026-07-15',
          visit_type: 'both',
        }),
        expect.objectContaining({
          price: 60,
          subscriber_id: null,
          visit_date: '2026-07-15',
          visit_type: 'crossfit',
        }),
        expect.objectContaining({
          price: 40,
          subscriber_id: null,
          visit_date: '2026-07-15',
          visit_type: 'gym',
        }),
      ]),
    );
    expect(await context.db.check_ins.count().exec()).toBe(0);
  });

  it('links active subscribers regardless of subscription status', async () => {
    const context = await createTestDataContext();
    await saveSubscriber(context, { id: 'subscriber-1', name: 'Ana Torres' });

    const visit = await recordDayVisit(context, {
      subscriber_id: 'subscriber-1',
      visit_type: 'gym',
    });

    expect(visit.subscriber_id).toBe('subscriber-1');
  });

  it('rejects subscribers outside the active organization', async () => {
    const context = await createTestDataContext('organization-1');
    const otherContext = { ...context, activeOrganizationId: 'organization-2' };
    await saveSubscriber(otherContext, { id: 'subscriber-2', name: 'Otra Persona' });

    await expect(
      recordDayVisit(context, { subscriber_id: 'subscriber-2', visit_type: 'gym' }),
    ).rejects.toThrow('Subscriber must belong to the active organization.');
  });

  it('archives mistakes without setting the RxDB deletion flag', async () => {
    const context = await createTestDataContext();
    const visit = await recordDayVisit(context, { visit_type: 'both' });

    await archiveDayVisit(context, visit.id);

    await expect(listDayVisits(context)).resolves.toEqual([]);
    const archived = await context.db.day_visits.findOne(visit.id).exec();
    expect(archived?._deleted).toBe(false);
    expect(archived?.deleted_at).toBeTruthy();
  });

  it('sorts history by visit date and creation time, newest first', async () => {
    const context = await createTestDataContext();
    await recordDayVisit(context, {
      now: new Date('2026-07-14T18:00:00.000Z'),
      visit_type: 'gym',
    });
    await recordDayVisit(context, {
      now: new Date('2026-07-15T16:00:00.000Z'),
      visit_type: 'crossfit',
    });
    await recordDayVisit(context, {
      now: new Date('2026-07-15T19:00:00.000Z'),
      visit_type: 'both',
    });

    const visits = await listDayVisits(context);
    expect(visits.map((visit) => visit.visit_type)).toEqual(['both', 'crossfit', 'gym']);
  });
});
