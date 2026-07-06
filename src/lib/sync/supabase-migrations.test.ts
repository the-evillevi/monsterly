import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');

async function readMigrationContaining(nameFragment: string) {
  const files = await readdir(migrationsDirectory);
  const match = files.find((file) => file.includes(nameFragment));

  expect(match).toBeDefined();

  return readFile(resolve(migrationsDirectory, match ?? ''), 'utf8');
}

describe('Supabase replication migrations', () => {
  it('converts replicated table primary keys and relationship columns to text', async () => {
    const migration = await readMigrationContaining('convert_replicated_ids_to_text');

    for (const table of ['subscribers', 'subscriptions', 'renewals']) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table}\\s+alter column id type text using id::text`),
      );
    }

    expect(migration).toMatch(
      /alter table public\.subscriptions\s+alter column subscriber_id type text using subscriber_id::text/,
    );
    expect(migration).toMatch(
      /alter table public\.renewals\s+alter column subscription_id type text using subscription_id::text/,
    );
    expect(migration).not.toMatch(/alter column organization_id/);
  });

  it('recreates organization-scoped foreign keys after the type conversion', async () => {
    const migration = await readMigrationContaining('convert_replicated_ids_to_text');

    expect(migration).toContain('add constraint subscriptions_subscriber_organization_fkey');
    expect(migration).toContain('add constraint renewals_subscription_organization_fkey');
    expect(
      migration.indexOf('drop constraint subscriptions_subscriber_organization_fkey'),
    ).toBeLessThan(migration.indexOf('add constraint subscriptions_subscriber_organization_fkey'));
  });

  it('adds replicated tables to the supabase_realtime publication', async () => {
    const migration = await readMigrationContaining('convert_replicated_ids_to_text');

    expect(migration).toMatch(
      /alter publication supabase_realtime\s+add table public\.subscribers, public\.subscriptions, public\.renewals/,
    );
  });

  it('adds nullable plan_name and price columns to subscriptions', async () => {
    const migration = await readMigrationContaining('add_subscription_plan_name_and_price');

    expect(migration).toContain('add column if not exists plan_name text');
    expect(migration).toContain('add column if not exists price numeric(10, 2)');
    expect(migration).toContain(
      'add constraint subscriptions_price_non_negative check (price is null or price >= 0)',
    );
  });

  it('keeps _deleted client-owned instead of deriving it from deleted_at', async () => {
    const migration = await readMigrationContaining('add_rxdb_sync_metadata');

    expect(migration).toContain('_deleted boolean not null default false');
    expect(migration).toContain('_modified timestamptz not null default now()');
    expect(migration).toContain('new._modified = now()');
    expect(migration).not.toMatch(/_deleted\s*=.*deleted_at/);
  });
});
