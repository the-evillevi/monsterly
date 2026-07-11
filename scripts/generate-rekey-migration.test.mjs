import { describe, expect, it } from 'vitest';

import { buildRekeyPlan, renderRekeySql, validateNameSplit } from './generate-rekey-migration.mjs';

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
    nombre: "Ana O'Connor López",
    telefono: null,
    membresia: 'Programación',
    fecha_inicio: '2026-06-30',
    vencimiento: '2026-07-31',
    monto: 500,
  },
];

const splits = [
  {
    nombre: 'Ejemplo Regular',
    name: 'Ejemplo',
    paternal_last_name: 'Regular',
    maternal_last_name: null,
  },
  {
    nombre: "Ana O'Connor López",
    name: 'Ana',
    paternal_last_name: "O'Connor",
    maternal_last_name: 'López',
  },
];

function fakeGenerators() {
  let ids = 0;
  let pins = 100000;

  return {
    newId: () => `uuid-${(ids += 1)}`,
    slugSuffix: () => 'abcd',
    checkInCode: () => String((pins += 1)),
  };
}

describe('validateNameSplit', () => {
  it('accepts splits whose parts reassemble the original nombre', () => {
    expect(validateNameSplit(records, splits).corrections).toEqual([]);
  });

  it('matches entries whose nombre differs only in whitespace', () => {
    const edited = [{ ...splits[0], nombre: ' Ejemplo  Regular ' }, splits[1]];

    expect(validateNameSplit(records, edited).corrections).toEqual([]);
  });

  it('rejects missing members', () => {
    expect(() => validateNameSplit(records, splits.slice(0, 1))).toThrow(
      'Missing split entry for "Ana O\'Connor López".',
    );
  });

  it('reports edited tokens as reviewed corrections instead of rejecting them', () => {
    const edited = [
      splits[0],
      { ...splits[1], maternal_last_name: null }, // reviewer dropped "López"
    ];

    expect(validateNameSplit(records, edited).corrections).toEqual([
      '"Ana O\'Connor López" -> "Ana O\'Connor"',
    ]);
  });

  it('rejects empty given names', () => {
    const edited = [splits[0], { ...splits[1], name: ' ' }];

    expect(() => validateNameSplit(records, edited)).toThrow(/Empty name/);
  });

  it('rejects duplicate split entries', () => {
    expect(() => validateNameSplit(records, [...splits, splits[0]])).toThrow(/Duplicate split/);
  });
});

describe('buildRekeyPlan', () => {
  it('maps old deterministic ids to fresh identifiers with split names', () => {
    const plan = buildRekeyPlan(records, splits, fakeGenerators());

    expect(plan).toMatchObject([
      {
        oldSubscriberId: 'import-ejemplo-regular',
        oldSubscriptionId: 'import-ejemplo-regular-sub',
        newSubscriberId: 'uuid-1',
        newSubscriptionId: 'uuid-2',
        slug: 'ejemplo-regular-abcd',
        checkInCode: '100001',
        name: 'Ejemplo',
        paternalLastName: 'Regular',
        maternalLastName: null,
      },
      {
        oldSubscriberId: 'import-ana-o-connor-lopez',
        oldSubscriptionId: 'import-ana-o-connor-lopez-sub',
        newSubscriberId: 'uuid-3',
        newSubscriptionId: 'uuid-4',
        slug: 'ana-o-connor-lopez-abcd',
        name: 'Ana',
        paternalLastName: "O'Connor",
        maternalLastName: 'López',
      },
    ]);
  });

  it('produces real UUIDv7 identifiers by default', () => {
    const plan = buildRekeyPlan(records, splits);

    for (const entry of plan) {
      expect(entry.newSubscriberId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(entry.checkInCode).toMatch(/^[1-9][0-9]{5}$/);
    }
  });
});

describe('renderRekeySql', () => {
  it('renders a single transaction with mapping, inserts, renewal update, and tombstones', () => {
    const sql = renderRekeySql(buildRekeyPlan(records, splits, fakeGenerators()));

    expect(sql.startsWith('-- Transient EVL-105 re-key')).toBe(true);
    expect(sql).toContain('begin;');
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
    expect(sql).toContain(
      "('import-ejemplo-regular', 'uuid-1', 'ejemplo-regular-abcd', '100001', 'Ejemplo', 'Regular', null)",
    );
    // Single quotes in names are escaped.
    expect(sql).toContain("'O''Connor'");
    expect(sql).toContain('insert into public.subscribers');
    expect(sql).toContain('insert into public.subscriptions');
    expect(sql).toContain('update public.renewals');
    expect(sql).toContain('set _deleted = true');
    expect(sql).toContain("id like 'import-%' and _deleted = false");
    // Randomly minted slugs/PINs are pre-checked against rows already in the
    // table so a collision aborts with an actionable message.
    expect(sql).toContain('regenerate the migration file');
  });
});
