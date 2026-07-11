#!/usr/bin/env node
// Generates the transient EVL-105 re-key migration: replaces the deterministic
// `import-<slug>` subscriber/subscription ids from the EVL-103 import with
// UUIDv7 rows carrying slugs, check-in PINs, and user-reviewed name splits.
//
// The emitted SQL inserts the new rows, re-points renewals, and tombstones the
// old rows (_deleted = true) so RxDB clients purge them on pull. The same file
// must be applied to local and prod so both environments hold identical ids.
//
// Usage:
//   node scripts/generate-rekey-migration.mjs \
//     [path/to/membresias.json] [path/to/name-split.json]
//
// Output: supabase/migrations/<version>_transient_import_rekey.sql (gitignored:
// it embeds real member names).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { v7 as uuidv7 } from 'uuid';

import {
  normalizeName,
  randomCheckInCode,
  randomSlugSuffix,
  slugify,
} from './import-subscribers.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = resolve(scriptDir, 'data/membresias-2026-07.json');
const DEFAULT_SPLIT_PATH = resolve(scriptDir, 'data/name-split-2026-07.json');
const MIGRATIONS_DIR = resolve(scriptDir, '../supabase/migrations');

/** Mirrors formatFullName in src/lib/domain/subscriber-identity.ts. */
function joinFullName(split) {
  return [split.name, split.paternal_last_name, split.maternal_last_name]
    .map(normalizeName)
    .filter(Boolean)
    .join(' ');
}

/**
 * Every member must appear in the split file exactly once, and the split parts
 * must reassemble the original nombre (whitespace-normalized) so a stray edit
 * can't silently drop or invent a name.
 */
export function validateNameSplit(records, splits) {
  const splitByNombre = new Map();

  for (const split of splits) {
    if (splitByNombre.has(split.nombre)) {
      throw new Error(`Duplicate split entry for "${split.nombre}".`);
    }
    splitByNombre.set(split.nombre, split);
  }

  const problems = [];

  for (const record of records) {
    const split = splitByNombre.get(record.nombre);

    if (!split) {
      problems.push(`Missing split entry for "${record.nombre}".`);
      continue;
    }

    if (!normalizeName(split.name)) {
      problems.push(`Empty name in the split for "${record.nombre}".`);
      continue;
    }

    const reassembled = joinFullName(split);

    if (reassembled !== normalizeName(record.nombre)) {
      problems.push(
        `Split for "${record.nombre}" reassembles to "${reassembled}"; parts must keep the original tokens.`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Name split file is not ready:\n- ${problems.join('\n- ')}`);
  }

  return splitByNombre;
}

/**
 * One entry per member: the old deterministic ids next to the freshly minted
 * UUIDv7 ids, slug, PIN, and split name. Generators are injectable for tests.
 */
export function buildRekeyPlan(
  records,
  splits,
  { newId = uuidv7, slugSuffix = randomSlugSuffix, checkInCode = randomCheckInCode } = {},
) {
  const splitByNombre = validateNameSplit(records, splits);
  const usedSlugs = new Set();
  const usedCodes = new Set();

  return records.map((record) => {
    const split = splitByNombre.get(record.nombre);
    const importSlug = slugify(record.nombre);
    const fullName = joinFullName(split);

    let slug;
    do {
      slug = `${slugify(fullName)}-${slugSuffix()}`;
    } while (usedSlugs.has(slug));
    usedSlugs.add(slug);

    let code;
    do {
      code = checkInCode();
    } while (usedCodes.has(code));
    usedCodes.add(code);

    return {
      checkInCode: code,
      maternalLastName: normalizeName(split.maternal_last_name) || null,
      name: normalizeName(split.name),
      newSubscriberId: newId(),
      newSubscriptionId: newId(),
      oldSubscriberId: `import-${importSlug}`,
      oldSubscriptionId: `import-${importSlug}-sub`,
      paternalLastName: normalizeName(split.paternal_last_name) || null,
      slug,
    };
  });
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function renderRekeySql(plan) {
  const subscriberValues = plan
    .map(
      (entry) =>
        `  (${[
          entry.oldSubscriberId,
          entry.newSubscriberId,
          entry.slug,
          entry.checkInCode,
          entry.name,
          entry.paternalLastName,
          entry.maternalLastName,
        ]
          .map(sqlLiteral)
          .join(', ')})`,
    )
    .join(',\n');
  const subscriptionValues = plan
    .map(
      (entry) =>
        `  (${[entry.oldSubscriptionId, entry.newSubscriptionId, entry.newSubscriberId]
          .map(sqlLiteral)
          .join(', ')})`,
    )
    .join(',\n');

  return `-- Transient EVL-105 re-key: replace import-<slug> ids with UUIDv7 rows
-- carrying slugs, check-in PINs, and reviewed name splits. Old rows become
-- _deleted tombstones so RxDB clients purge them on pull. NEVER COMMIT: this
-- file embeds real member names.
begin;

create temp table rekey_subscribers (
  old_id text primary key,
  new_id text not null,
  slug text not null,
  check_in_code text not null,
  name text not null,
  paternal_last_name text,
  maternal_last_name text
) on commit drop;

insert into rekey_subscribers
  (old_id, new_id, slug, check_in_code, name, paternal_last_name, maternal_last_name)
values
${subscriberValues};

create temp table rekey_subscriptions (
  old_id text primary key,
  new_id text not null,
  new_subscriber_id text not null
) on commit drop;

insert into rekey_subscriptions (old_id, new_id, new_subscriber_id)
values
${subscriptionValues};

-- Abort when the live data no longer matches the mapping, or when a randomly
-- generated slug/PIN collides with a row already in the table (backfilled or
-- app-created) — regenerate the migration file and retry in that case.
do $$
declare
  missing_subscribers integer;
  missing_subscriptions integer;
  colliding_identifiers integer;
begin
  select count(*) into missing_subscribers
  from rekey_subscribers mapping
  left join public.subscribers old_row
    on old_row.id = mapping.old_id and old_row._deleted = false
  where old_row.id is null;

  select count(*) into missing_subscriptions
  from rekey_subscriptions mapping
  left join public.subscriptions old_row
    on old_row.id = mapping.old_id and old_row._deleted = false
  where old_row.id is null;

  select count(*) into colliding_identifiers
  from rekey_subscribers mapping
  join public.subscribers existing_row
    on existing_row.slug = mapping.slug
    or existing_row.check_in_code = mapping.check_in_code;

  if missing_subscribers > 0 or missing_subscriptions > 0 then
    raise exception 'Re-key mapping mismatch: % subscribers and % subscriptions not found',
      missing_subscribers, missing_subscriptions;
  end if;

  if colliding_identifiers > 0 then
    raise exception 'Re-key would collide with % existing slug/check_in_code values; regenerate the migration file',
      colliding_identifiers;
  end if;
end;
$$;

-- New subscriber rows: fresh identity tiers, everything else copied verbatim.
insert into public.subscribers
  (id, organization_id, name, paternal_last_name, maternal_last_name, slug,
   check_in_code, gender, phone_number, created_at, updated_at, deleted_at, _deleted)
select
  mapping.new_id,
  old_row.organization_id,
  mapping.name,
  mapping.paternal_last_name,
  mapping.maternal_last_name,
  mapping.slug,
  mapping.check_in_code,
  old_row.gender,
  old_row.phone_number,
  old_row.created_at,
  old_row.updated_at,
  old_row.deleted_at,
  false
from rekey_subscribers mapping
join public.subscribers old_row on old_row.id = mapping.old_id;

-- New subscription rows keyed to the new subscriber ids; dates and plan data
-- copied verbatim so payment statuses cannot change.
insert into public.subscriptions
  (id, organization_id, subscriber_id, kind, billing_period, custom_days,
   plan_name, price, start_date, paid_until_date, created_at, updated_at,
   deleted_at, _deleted)
select
  mapping.new_id,
  old_row.organization_id,
  mapping.new_subscriber_id,
  old_row.kind,
  old_row.billing_period,
  old_row.custom_days,
  old_row.plan_name,
  old_row.price,
  old_row.start_date,
  old_row.paid_until_date,
  old_row.created_at,
  old_row.updated_at,
  old_row.deleted_at,
  false
from rekey_subscriptions mapping
join public.subscriptions old_row on old_row.id = mapping.old_id;

-- Renewal ids are already opaque UUIDs; only their FK moves to the new
-- subscription rows (an in-place update replicates cleanly).
update public.renewals renewal
set subscription_id = mapping.new_id
from rekey_subscriptions mapping
where renewal.subscription_id = mapping.old_id;

-- Tombstone the old rows: _deleted = true replicates as a hard delete so
-- local RxDB databases upgrade in place without duplicates.
update public.subscriptions old_row
set _deleted = true
from rekey_subscriptions mapping
where old_row.id = mapping.old_id;

update public.subscribers old_row
set _deleted = true
from rekey_subscribers mapping
where old_row.id = mapping.old_id;

-- Final safety net before committing.
do $$
declare
  active_import_rows integer;
  dangling_renewals integer;
begin
  select
    (select count(*) from public.subscribers where id like 'import-%' and _deleted = false)
    + (select count(*) from public.subscriptions where id like 'import-%' and _deleted = false)
  into active_import_rows;

  select count(*) into dangling_renewals
  from public.renewals
  where subscription_id like 'import-%';

  if active_import_rows > 0 or dangling_renewals > 0 then
    raise exception 'Re-key incomplete: % active import rows, % dangling renewals',
      active_import_rows, dangling_renewals;
  end if;
end;
$$;

commit;
`;
}

function migrationVersion(date = new Date()) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

async function main() {
  const dataPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_DATA_PATH;
  const splitPath = process.argv[3] ? resolve(process.argv[3]) : DEFAULT_SPLIT_PATH;

  const records = JSON.parse(readFileSync(dataPath, 'utf8'));
  const splits = JSON.parse(readFileSync(splitPath, 'utf8'));

  const plan = buildRekeyPlan(records, splits);
  const sql = renderRekeySql(plan);
  const version = migrationVersion();
  const outputPath = resolve(MIGRATIONS_DIR, `${version}_transient_import_rekey.sql`);

  writeFileSync(outputPath, sql);
  console.log(`Wrote re-key migration for ${plan.length} members to ${outputPath}`);
}

// Pure helpers stay importable by tests without side effects.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
