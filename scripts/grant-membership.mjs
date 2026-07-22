#!/usr/bin/env node
// Grant (or revive) an admin/staff membership in an organization, keyed to a
// Google account's email. This is the lockout-prevention tool for the EVL-146
// prod cutover: run it with the service-role key BEFORE the deploy so the
// operators already have active memberships when they first sign in.
//
// With --create it also pre-creates the auth user by email. Google's verified
// email auto-links that user to the identity on first OAuth sign-in, so an
// operator who has never signed in can still be granted access up front and
// never sees the "Sin acceso" screen.
//
// The upsert is idempotent and re-runnable: it revives inactive/soft-deleted
// rows back to active.
//
// Usage:
//   SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   MONSTERLY_ORGANIZATION_ID=<org uuid> \
//   node scripts/grant-membership.mjs --email <gmail> --role admin [--create]

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/** Minimal flag parser for --email/--role/--create (space or = separated). */
export function parseArgs(argv) {
  const args = { email: undefined, role: 'admin', create: false };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--create') {
      args.create = true;
    } else if (token === '--email') {
      args.email = argv[(index += 1)];
    } else if (token === '--role') {
      args.role = argv[(index += 1)];
    } else if (token.startsWith('--email=')) {
      args.email = token.slice('--email='.length);
    } else if (token.startsWith('--role=')) {
      args.role = token.slice('--role='.length);
    }
  }

  return args;
}

/** auth.users is not reachable via PostgREST, so match on the listUsers page. */
export function findUserByEmail(users, email) {
  const target = normalizeEmail(email);

  return users.find((user) => normalizeEmail(user.email) === target) ?? null;
}

/**
 * Membership row for upsert. Always active with a cleared deleted_at, so a
 * re-run revives a previously inactive or soft-deleted member.
 */
export function buildMembershipRow({ organizationId, userId, role }) {
  return {
    organization_id: organizationId,
    user_id: userId,
    role,
    status: 'active',
    deleted_at: null,
  };
}

async function findUserAcrossPages(client, email) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }

    const match = findUserByEmail(data.users, email);

    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.MONSTERLY_ORGANIZATION_ID;

  const missing = [
    url ? null : 'SUPABASE_URL',
    serviceRoleKey ? null : 'SUPABASE_SERVICE_ROLE_KEY',
    organizationId ? null : 'MONSTERLY_ORGANIZATION_ID',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }

  const { email, role, create } = parseArgs(process.argv.slice(2));
  if (!email) {
    throw new Error('Missing required --email <gmail>');
  }
  if (role !== 'admin' && role !== 'staff') {
    throw new Error(`Invalid --role "${role}"; use admin or staff.`);
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await findUserAcrossPages(client, email);

  if (!user) {
    if (!create) {
      throw new Error(
        `No auth user found for ${email}. Ask them to sign in once first, or re-run with --create.`,
      );
    }

    const { data, error } = await client.auth.admin.createUser({ email, email_confirm: true });
    if (error) {
      throw new Error(`createUser failed: ${error.message}`);
    }

    user = data.user;
    console.log(`Created auth user ${user.id} for ${email} (Google auto-links on first sign-in).`);
  }

  const row = buildMembershipRow({ organizationId, userId: user.id, role });
  const upsert = await client
    .from('organization_members')
    .upsert(row, { onConflict: 'organization_id,user_id' });
  if (upsert.error) {
    throw new Error(`Membership upsert failed: ${upsert.error.message}`);
  }

  const { data: verify, error: verifyError } = await client
    .from('organization_members')
    .select('id, role, status, deleted_at')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (verifyError) {
    throw new Error(`Verification read failed: ${verifyError.message}`);
  }

  console.log(`Granted ${role} membership to ${email} (user ${user.id}) in org ${organizationId}.`);
  console.log(`Verified row:`, verify);
}

// Only run when executed directly, so the pure helpers can be imported by tests
// without touching the network.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
