// Idempotent one-off importer: upserts subscribers and their subscriptions
// from a JSON export of the legacy membership spreadsheet into Supabase.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... MONSTERLY_ORGANIZATION_ID=... \
//     node scripts/import-subscribers.mjs
//
// SUPABASE_SECRET_KEY must be the service-role key: RLS only allows writes
// from authenticated organization members, which this script is not.
// The data file (see scripts/data/membresias.example.json for the shape) is
// gitignored because it contains real names and phone numbers.
import { readFile } from 'node:fs/promises';

import { createClient } from '@supabase/supabase-js';

function required(name) {
  const value = process.env[name];

  if (!value) {
    console.error(`Missing required env var ${name}.`);
    process.exit(1);
  }

  return value;
}

const url = required('SUPABASE_URL');
const secretKey = required('SUPABASE_SECRET_KEY');
const organizationId = required('MONSTERLY_ORGANIZATION_ID');
const dataFile =
  process.env.DATA_FILE ?? new URL('./data/membresias-2026-07.json', import.meta.url);

function slug(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanPhone(telefono) {
  const digits = (telefono ?? '').replace(/\D/g, '');

  return /^\d{10,15}$/.test(digits) ? digits : null;
}

async function must(promise, label) {
  const { data, error } = await promise;

  if (error) {
    console.error(`${label} failed: ${error.message}`);
    process.exit(1);
  }

  return data;
}

const entries = JSON.parse(await readFile(dataFile, 'utf8'));

const seenSlugs = new Set();
for (const entry of entries) {
  const entrySlug = slug(entry.nombre.trim());

  if (seenSlugs.has(entrySlug)) {
    console.error(`Duplicate id slug "${entrySlug}"; make the names distinguishable first.`);
    process.exit(1);
  }

  seenSlugs.add(entrySlug);
}

const client = createClient(url, secretKey, { auth: { persistSession: false } });

const organization = await must(
  client.from('organizations').select('id, name').eq('id', organizationId).maybeSingle(),
  'Organization lookup',
);

if (!organization) {
  console.error(
    `Organization ${organizationId} not found. Create it first:\n` +
      `  insert into public.organizations (id, name) values ('${organizationId}', '<name>');`,
  );
  process.exit(1);
}

const subscriberRows = entries.map((entry) => ({
  id: `import-${slug(entry.nombre.trim())}`,
  organization_id: organizationId,
  name: entry.nombre.trim(),
  gender: 'unspecified',
  phone_number: cleanPhone(entry.telefono),
}));

// created_at/updated_at/_deleted/_modified stay unset on purpose: column
// defaults and the set_rxdb_sync_metadata trigger own them.
const subscriptionRows = entries.map((entry) => ({
  id: `import-${slug(entry.nombre.trim())}-sub`,
  organization_id: organizationId,
  subscriber_id: `import-${slug(entry.nombre.trim())}`,
  kind: entry.membresia.trim() === 'Programación' ? 'crossfit' : 'gym',
  billing_period: entry.monto === 0 ? 'yearly' : 'monthly',
  plan_name: entry.membresia.trim(),
  price: entry.monto,
  start_date: entry.fecha_inicio,
  paid_until_date: entry.vencimiento,
}));

// Subscribers first: subscriptions reference them through a composite FK.
await must(
  client.from('subscribers').upsert(subscriberRows, { onConflict: 'id' }),
  'Subscribers upsert',
);
await must(
  client.from('subscriptions').upsert(subscriptionRows, { onConflict: 'id' }),
  'Subscriptions upsert',
);

const today = new Date().toISOString().slice(0, 10);
const countImported = (table) =>
  client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .like('id', 'import-%');

const { count: subscriberCount } = await countImported('subscribers');
const { count: subscriptionCount } = await countImported('subscriptions');
const { count: vencidoCount } = await countImported('subscriptions').lt('paid_until_date', today);

console.log(`Organization: ${organization.name} (${organizationId})`);
console.log(`Imported subscribers: ${subscriberCount}`);
console.log(`Imported subscriptions: ${subscriptionCount}`);
console.log(`Vencido (paid_until_date < ${today}): ${vencidoCount}`);
