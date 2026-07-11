import { describe, expect, it } from 'vitest';

import {
  buildImportRows,
  cleanPhoneNumber,
  memberKey,
  normalizeName,
  randomCheckInCode,
  randomSlugSuffix,
  slugify,
  toBillingPeriod,
  toKind,
} from './import-subscribers.mjs';

describe('import cleaning helpers', () => {
  it('slugifies accented names', () => {
    expect(slugify('Abigail López')).toBe('abigail-lopez');
    expect(slugify('  José  Ramírez  ')).toBe('jose-ramirez');
  });

  it('keeps only 10-15 digit phone numbers', () => {
    expect(cleanPhoneNumber('7772562551')).toBe('7772562551');
    expect(cleanPhoneNumber('55 1234 5678')).toBe('5512345678');
    expect(cleanPhoneNumber('123')).toBeNull();
    expect(cleanPhoneNumber(null)).toBeNull();
    expect(cleanPhoneNumber('1234567890123456')).toBeNull();
  });

  it('maps Programación to crossfit and everything else to gym', () => {
    expect(toKind('Programación')).toBe('crossfit');
    expect(toKind('Regular')).toBe('gym');
    expect(toKind('3 días por semana')).toBe('gym');
  });

  it('treats prepaid (monto 0) as yearly and the rest as monthly', () => {
    expect(toBillingPeriod(0)).toBe('yearly');
    expect(toBillingPeriod(450)).toBe('monthly');
  });

  it('normalizes whitespace in names', () => {
    expect(normalizeName('  Iliana  Pérez ')).toBe('Iliana Pérez');
  });

  it('generates unambiguous slug suffixes and numeric PINs', () => {
    expect(randomSlugSuffix()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{4}$/);
    expect(randomCheckInCode()).toMatch(/^[1-9][0-9]{5}$/);
  });

  it('builds accent- and case-insensitive member keys from split names', () => {
    expect(memberKey({ name: 'Ana Gómez' })).toBe('ana-gomez');
    expect(memberKey({ name: 'ana gomez' })).toBe('ana-gomez');
    expect(
      memberKey({ name: 'Dulce', paternal_last_name: 'Palomino', maternal_last_name: 'García' }),
    ).toBe('dulce-palomino-garcia');
    expect(memberKey({ name: 'Dulce Palomino García' })).toBe('dulce-palomino-garcia');
  });
});

describe('buildImportRows', () => {
  const org = 'org-uuid';
  const records = [
    {
      nombre: 'Ejemplo Regular',
      telefono: '5512345678',
      membresia: 'Regular',
      fecha_inicio: '2026-07-01',
      vencimiento: '2026-07-31',
      monto: 450,
    },
    {
      nombre: 'Ejemplo Programación ',
      telefono: '123',
      membresia: ' Programación ',
      fecha_inicio: '2026-06-30',
      vencimiento: '2026-07-31',
      monto: 0,
    },
  ];

  it('builds cleaned rows with three-tier identifiers', () => {
    let counter = 0;
    const { skipped, subscribers, subscriptions } = buildImportRows(records, org, {
      newId: () => `uuid-${(counter += 1)}`,
      slugSuffix: () => 'abcd',
      checkInCode: () => '123456',
    });

    expect(skipped).toBe(0);
    expect(subscribers).toMatchObject([
      {
        id: 'uuid-1',
        organization_id: org,
        name: 'Ejemplo Regular',
        slug: 'ejemplo-regular-abcd',
        check_in_code: '123456',
        gender: 'unspecified',
        phone_number: '5512345678',
        created_at: '2026-07-01T00:00:00Z',
        _deleted: false,
      },
      {
        id: 'uuid-3',
        name: 'Ejemplo Programación',
        slug: 'ejemplo-programacion-abcd',
        phone_number: null,
      },
    ]);
    expect(subscriptions).toMatchObject([
      {
        id: 'uuid-2',
        subscriber_id: 'uuid-1',
        kind: 'gym',
        billing_period: 'monthly',
        plan_name: 'Regular',
        price: 450,
        start_date: '2026-07-01',
        paid_until_date: '2026-07-31',
      },
      {
        id: 'uuid-4',
        subscriber_id: 'uuid-3',
        kind: 'crossfit',
        billing_period: 'yearly',
        plan_name: 'Programación',
        price: 0,
      },
    ]);
  });

  it('never mints import-prefixed ids', () => {
    const { subscribers, subscriptions } = buildImportRows(records, org);

    for (const row of [...subscribers, ...subscriptions]) {
      expect(row.id).not.toMatch(/^import-/);
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it('skips members that already exist, matching case- and accent-insensitively', () => {
    const { skipped, subscribers, subscriptions } = buildImportRows(records, org, {
      existingMembers: new Map([['ejemplo-regular', { id: 'existing-1', hasSubscription: true }]]),
    });

    expect(skipped).toBe(1);
    expect(subscribers).toMatchObject([{ name: 'Ejemplo Programación' }]);
    expect(subscriptions).toHaveLength(1);
  });

  it('matches re-keyed rows whose DB name is split into surname columns', () => {
    const dbRow = { name: 'Ejemplo', paternal_last_name: 'Regular', maternal_last_name: null };
    const { skipped, subscribers } = buildImportRows(records, org, {
      existingMembers: new Map([[memberKey(dbRow), { id: 'rekeyed-1', hasSubscription: true }]]),
    });

    expect(skipped).toBe(1);
    expect(subscribers).toMatchObject([{ name: 'Ejemplo Programación' }]);
  });

  it('rebuilds only the subscription when a previous run left a member without one', () => {
    const { skipped, subscribers, subscriptions } = buildImportRows(records, org, {
      existingMembers: new Map([['ejemplo-regular', { id: 'existing-1', hasSubscription: false }]]),
    });

    expect(skipped).toBe(1);
    expect(subscribers).toMatchObject([{ name: 'Ejemplo Programación' }]);
    expect(subscriptions).toHaveLength(2);
    expect(subscriptions[0]).toMatchObject({ subscriber_id: 'existing-1', plan_name: 'Regular' });
  });

  it('throws on duplicate names within the file, even across spellings', () => {
    expect(() => buildImportRows([records[0], { ...records[0] }], org)).toThrow(
      'Duplicate member "Ejemplo Regular"',
    );
    expect(() =>
      buildImportRows([records[0], { ...records[0], nombre: 'ejemplo regular' }], org),
    ).toThrow('Duplicate member "ejemplo regular"');
  });
});
