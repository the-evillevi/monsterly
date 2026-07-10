import { describe, expect, it } from 'vitest';

import {
  buildImportRows,
  cleanPhoneNumber,
  slugify,
  toBillingPeriod,
  toKind,
} from './import-subscribers.mjs';

describe('import cleaning helpers', () => {
  it('slugifies accented names into deterministic ids', () => {
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
});

describe('buildImportRows', () => {
  const org = 'org-uuid';

  it('builds cleaned subscriber + subscription rows with deterministic ids', () => {
    const { subscribers, subscriptions } = buildImportRows(
      [
        {
          nombre: 'Abigail López ',
          telefono: 'abc',
          membresia: ' Programación ',
          fecha_inicio: '2026-06-30',
          vencimiento: '2026-07-31',
          monto: 0,
        },
      ],
      org,
    );

    expect(subscribers[0]).toMatchObject({
      id: 'import-abigail-lopez',
      organization_id: org,
      name: 'Abigail López',
      gender: 'unspecified',
      phone_number: null,
      created_at: '2026-06-30T00:00:00Z',
    });
    expect(subscriptions[0]).toMatchObject({
      id: 'import-abigail-lopez-sub',
      subscriber_id: 'import-abigail-lopez',
      kind: 'crossfit',
      billing_period: 'yearly',
      plan_name: 'Programación',
      price: 0,
      start_date: '2026-06-30',
      paid_until_date: '2026-07-31',
    });
  });

  it('throws when two names collide on the same slug', () => {
    expect(() =>
      buildImportRows(
        [
          {
            nombre: 'Ana Gómez',
            telefono: '',
            membresia: 'Regular',
            fecha_inicio: '2026-07-01',
            vencimiento: '2026-07-31',
            monto: 450,
          },
          {
            nombre: 'ana gomez',
            telefono: '',
            membresia: 'Regular',
            fecha_inicio: '2026-07-01',
            vencimiento: '2026-07-31',
            monto: 450,
          },
        ],
        org,
      ),
    ).toThrow(/collide/);
  });
});
