import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkMembership,
  clearMembershipCache,
  readMembershipCache,
  writeMembershipCache,
} from './membership';

const organizationId = '4bf990ae-b365-4c8c-b983-8498a6940e8f';
const userId = '00000000-0000-0000-0000-000000000001';

function stubClient(result: { data?: unknown; error?: unknown }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    maybeSingle: () => Promise.resolve(result),
  };

  return { from: () => builder } as unknown as SupabaseClient;
}

describe('checkMembership', () => {
  it('returns member with role when an active row exists', async () => {
    const client = stubClient({ data: { id: 'row-1', role: 'admin' }, error: null });

    await expect(checkMembership(client, organizationId, userId)).resolves.toEqual({
      outcome: 'member',
      role: 'admin',
    });
  });

  it('returns denied when the query runs but returns no row', async () => {
    const client = stubClient({ data: null, error: null });

    await expect(checkMembership(client, organizationId, userId)).resolves.toEqual({
      outcome: 'denied',
    });
  });

  it('returns unknown when the query errors (offline / transport failure)', async () => {
    const client = stubClient({ data: null, error: { message: 'network down' } });

    await expect(checkMembership(client, organizationId, userId)).resolves.toEqual({
      outcome: 'unknown',
    });
  });
});

describe('membership cache', () => {
  afterEach(() => {
    clearMembershipCache();
  });

  it('round-trips a cached membership', () => {
    writeMembershipCache(organizationId, userId, {
      ok: true,
      role: 'staff',
      verifiedAt: '2026-07-16T00:00:00.000Z',
    });

    expect(readMembershipCache(organizationId, userId)).toEqual({
      ok: true,
      role: 'staff',
      verifiedAt: '2026-07-16T00:00:00.000Z',
    });
  });

  it('returns null for a missing entry', () => {
    expect(readMembershipCache(organizationId, userId)).toBeNull();
  });

  it('clears a specific entry', () => {
    writeMembershipCache(organizationId, userId, { ok: true, role: 'admin', verifiedAt: 'x' });

    clearMembershipCache(organizationId, userId);

    expect(readMembershipCache(organizationId, userId)).toBeNull();
  });

  it('clears every cached membership when called with no arguments', () => {
    writeMembershipCache(organizationId, userId, { ok: true, role: 'admin', verifiedAt: 'x' });
    writeMembershipCache(organizationId, 'other-user', {
      ok: true,
      role: 'staff',
      verifiedAt: 'y',
    });

    clearMembershipCache();

    expect(readMembershipCache(organizationId, userId)).toBeNull();
    expect(readMembershipCache(organizationId, 'other-user')).toBeNull();
  });
});
