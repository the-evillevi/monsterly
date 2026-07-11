#!/usr/bin/env node
// Idempotent importer for the operator's spreadsheet export. Inserts subscribers
// and their subscriptions into Supabase using the service-role key. Members are
// matched by normalized full name: rows that already exist are skipped, so
// re-running the script changes no row counts (and can never resurrect rows
// re-keyed away by EVL-105).
//
// New rows get the same three-tier identity as app-created ones: a UUIDv7 id,
// a unique slug, and a numeric check-in PIN.
//
// Usage:
//   SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   MONSTERLY_ORGANIZATION_ID=<org uuid> \
//   node scripts/import-subscribers.mjs [path/to/membresias.json]
//
// Defaults to scripts/data/membresias-2026-07.json when no path is given.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { webcrypto } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import { v7 as uuidv7 } from 'uuid';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = resolve(scriptDir, 'data/membresias-2026-07.json');

const SLUG_SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Accent-insensitive, url-safe slug base for the readable identifier. */
export function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Keep a phone only when it has 10-15 digits; otherwise drop it. */
export function cleanPhoneNumber(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** "Programación" is the CrossFit plan; everything else is gym. */
export function toKind(planName) {
  return String(planName).trim() === 'Programación' ? 'crossfit' : 'gym';
}

/** A prepaid (monto 0) membership is a yearly plan; everything else monthly. */
export function toBillingPeriod(amount) {
  return Number(amount) === 0 ? 'yearly' : 'monthly';
}

/** Whitespace-normalized name used to match spreadsheet rows to DB rows. */
export function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

// These generators mirror src/lib/domain/subscriber-identity.ts (the .mjs
// scripts cannot import TS); keep both in sync.
export function randomSlugSuffix(length = 4) {
  // Reject bytes past the largest multiple of the alphabet size so every
  // character is equally likely.
  const limit = 256 - (256 % SLUG_SUFFIX_ALPHABET.length);
  let suffix = '';

  while (suffix.length < length) {
    for (const byte of webcrypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && suffix.length < length) {
        suffix += SLUG_SUFFIX_ALPHABET[byte % SLUG_SUFFIX_ALPHABET.length];
      }
    }
  }

  return suffix;
}

// Uniform over [100000, 999999] via rejection sampling — a front-desk PIN
// must not skew guessable.
export function randomCheckInCode() {
  const range = 900_000;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buffer = new Uint32Array(1);
  let value;

  do {
    webcrypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return String(100_000 + (value % range));
}

/**
 * Accent- and case-insensitive identity key used to decide whether a
 * spreadsheet row and a DB row are the same person. DB rows carry split last
 * names (post EVL-105), so the key is built from the reassembled full name.
 */
export function memberKey({ name, paternal_last_name = null, maternal_last_name = null }) {
  return slugify(
    [name, paternal_last_name, maternal_last_name].map(normalizeName).filter(Boolean).join(' '),
  );
}

/**
 * Turn cleaned spreadsheet rows into subscriber + subscription records with
 * three-tier identifiers, skipping members that already exist (matched by
 * memberKey). Throws on duplicate keys within the file so two spellings of
 * the same person can never silently become two rows. For skipped members
 * whose subscriber row exists but has no subscription (a previous partially
 * failed run), the subscription is rebuilt against the existing id.
 */
export function buildImportRows(
  records,
  organizationId,
  {
    existingMembers = new Map(),
    newId = uuidv7,
    slugSuffix = randomSlugSuffix,
    checkInCode = randomCheckInCode,
  } = {},
) {
  const seen = new Set();
  const subscribers = [];
  const subscriptions = [];
  let skipped = 0;

  for (const record of records) {
    const name = normalizeName(record.nombre);
    const planName = String(record.membresia).trim();
    const key = memberKey({ name });

    if (seen.has(key)) {
      throw new Error(`Duplicate member "${name}"; make the names distinguishable first.`);
    }
    seen.add(key);

    // Deterministic timestamp so re-generated rows stay byte-stable. Triggers
    // set _modified on the server side.
    const timestamp = `${record.fecha_inicio}T00:00:00Z`;
    const existing = existingMembers.get(key);
    let subscriberId;

    if (existing) {
      skipped += 1;

      if (existing.hasSubscription) {
        continue;
      }

      // Subscriber landed on a previous run but its subscription insert
      // failed; rebuild only the missing subscription.
      subscriberId = existing.id;
    } else {
      subscriberId = newId();

      subscribers.push({
        id: subscriberId,
        organization_id: organizationId,
        name,
        slug: `${slugify(name)}-${slugSuffix()}`,
        check_in_code: checkInCode(),
        gender: 'unspecified',
        phone_number: cleanPhoneNumber(record.telefono),
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
        _deleted: false,
      });
    }

    subscriptions.push({
      id: newId(),
      organization_id: organizationId,
      subscriber_id: subscriberId,
      kind: toKind(planName),
      billing_period: toBillingPeriod(record.monto),
      custom_days: null,
      plan_name: planName,
      price: Number(record.monto),
      start_date: record.fecha_inicio,
      paid_until_date: record.vencimiento,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      _deleted: false,
    });
  }

  return { skipped, subscribers, subscriptions };
}

/** Fetch every row of a PostgREST query, paging past the 1000-row cap. */
async function fetchAllRows(buildQuery) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Row fetch failed: ${error.message}`);
    }

    rows.push(...data);

    if (data.length < pageSize) {
      return rows;
    }
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.MONSTERLY_ORGANIZATION_ID;
  const dataPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_DATA_PATH;

  const missing = [
    url ? null : 'SUPABASE_URL',
    serviceRoleKey ? null : 'SUPABASE_SERVICE_ROLE_KEY',
    organizationId ? null : 'MONSTERLY_ORGANIZATION_ID',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  const records = JSON.parse(readFileSync(dataPath, 'utf8'));

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [existingSubscribers, existingSubscriptions] = await Promise.all([
    fetchAllRows(() =>
      client
        .from('subscribers')
        .select('id, name, paternal_last_name, maternal_last_name')
        .eq('organization_id', organizationId)
        .eq('_deleted', false),
    ),
    fetchAllRows(() =>
      client.from('subscriptions').select('subscriber_id').eq('organization_id', organizationId),
    ),
  ]);

  const subscribedIds = new Set(existingSubscriptions.map((row) => row.subscriber_id));
  const existingMembers = new Map(
    existingSubscribers.map((row) => [
      memberKey(row),
      { id: row.id, hasSubscription: subscribedIds.has(row.id) },
    ]),
  );
  const { skipped, subscribers, subscriptions } = buildImportRows(records, organizationId, {
    existingMembers,
  });

  if (subscribers.length > 0) {
    const subscriberResult = await client.from('subscribers').insert(subscribers);
    if (subscriberResult.error) {
      throw new Error(`Subscriber insert failed: ${subscriberResult.error.message}`);
    }
  }

  // Can be non-empty even with zero new subscribers: it also rebuilds
  // subscriptions lost to a partially failed previous run.
  if (subscriptions.length > 0) {
    const subscriptionResult = await client.from('subscriptions').insert(subscriptions);
    if (subscriptionResult.error) {
      throw new Error(`Subscription insert failed: ${subscriptionResult.error.message}`);
    }
  }

  console.log(
    `Imported ${subscribers.length} new subscribers (+${subscriptions.length} subscriptions) ` +
      `into org ${organizationId}; skipped ${skipped} already present.`,
  );
}

// Only run the importer when executed directly, so the pure helpers above can
// be imported by tests without touching the network.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
