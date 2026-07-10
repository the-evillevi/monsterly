#!/usr/bin/env node
// Idempotent importer for the operator's spreadsheet export. Upserts subscribers
// and their subscriptions into Supabase using the service-role key and
// deterministic `import-<slug>` ids, so re-running it changes no row counts.
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

import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = resolve(scriptDir, 'data/membresias-2026-07.json');

/** Accent-insensitive, url-safe slug used to build deterministic ids. */
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

/**
 * Turn cleaned spreadsheet rows into subscriber + subscription records.
 * Throws on a slug collision so duplicate names never silently overwrite.
 */
export function buildImportRows(records, organizationId) {
  const seen = new Set();
  const subscribers = [];
  const subscriptions = [];

  for (const record of records) {
    const name = String(record.nombre).trim();
    const planName = String(record.membresia).trim();
    const slug = slugify(name);

    if (seen.has(slug)) {
      throw new Error(`Duplicate import slug "${slug}" for "${name}"; ids would collide.`);
    }
    seen.add(slug);

    const subscriberId = `import-${slug}`;
    const subscriptionId = `import-${slug}-sub`;
    // Deterministic timestamp so re-running the import is byte-stable, not just
    // count-stable. Triggers set _modified on the server side.
    const timestamp = `${record.fecha_inicio}T00:00:00Z`;

    subscribers.push({
      id: subscriberId,
      organization_id: organizationId,
      name,
      gender: 'unspecified',
      phone_number: cleanPhoneNumber(record.telefono),
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      _deleted: false,
    });

    subscriptions.push({
      id: subscriptionId,
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

  return { subscribers, subscriptions };
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
  const { subscribers, subscriptions } = buildImportRows(records, organizationId);

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const subscriberResult = await client
    .from('subscribers')
    .upsert(subscribers, { onConflict: 'id' });
  if (subscriberResult.error) {
    throw new Error(`Subscriber upsert failed: ${subscriberResult.error.message}`);
  }

  const subscriptionResult = await client
    .from('subscriptions')
    .upsert(subscriptions, { onConflict: 'id' });
  if (subscriptionResult.error) {
    throw new Error(`Subscription upsert failed: ${subscriptionResult.error.message}`);
  }

  const { count } = await client
    .from('subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .like('id', 'import-%');

  console.log(
    `Imported ${subscribers.length} subscribers + ${subscriptions.length} subscriptions ` +
      `into org ${organizationId}. Imported rows now in DB: ${count}.`,
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
