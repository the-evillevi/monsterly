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

export function randomSlugSuffix(length = 4) {
  const bytes = webcrypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => SLUG_SUFFIX_ALPHABET[byte % SLUG_SUFFIX_ALPHABET.length]).join(
    '',
  );
}

export function randomCheckInCode() {
  const digits = webcrypto.getRandomValues(new Uint8Array(6));
  return Array.from(digits, (byte, index) =>
    index === 0 ? String((byte % 9) + 1) : String(byte % 10),
  ).join('');
}

/**
 * Turn cleaned spreadsheet rows into subscriber + subscription records with
 * three-tier identifiers, skipping members that already exist (matched by
 * normalized name). Throws on duplicate names within the file so two people
 * can never silently collapse into one row.
 */
export function buildImportRows(
  records,
  organizationId,
  {
    existingNames = new Set(),
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

    if (seen.has(name)) {
      throw new Error(`Duplicate member "${name}"; make the names distinguishable first.`);
    }
    seen.add(name);

    if (existingNames.has(name)) {
      skipped += 1;
      continue;
    }

    const subscriberId = newId();
    // Deterministic timestamp so re-generated rows stay byte-stable. Triggers
    // set _modified on the server side.
    const timestamp = `${record.fecha_inicio}T00:00:00Z`;

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

  const existingResult = await client
    .from('subscribers')
    .select('name')
    .eq('organization_id', organizationId)
    .eq('_deleted', false);
  if (existingResult.error) {
    throw new Error(`Subscriber lookup failed: ${existingResult.error.message}`);
  }

  const existingNames = new Set(existingResult.data.map((row) => normalizeName(row.name)));
  const { skipped, subscribers, subscriptions } = buildImportRows(records, organizationId, {
    existingNames,
  });

  if (subscribers.length > 0) {
    const subscriberResult = await client.from('subscribers').insert(subscribers);
    if (subscriberResult.error) {
      throw new Error(`Subscriber insert failed: ${subscriberResult.error.message}`);
    }

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
