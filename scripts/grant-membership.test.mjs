import { describe, expect, it } from 'vitest';

import {
  buildMembershipRow,
  findUserByEmail,
  normalizeEmail,
  parseArgs,
} from './grant-membership.mjs';

describe('parseArgs', () => {
  it('parses space-separated flags with an admin default role', () => {
    expect(parseArgs(['--email', 'a@b.com'])).toEqual({
      email: 'a@b.com',
      role: 'admin',
      create: false,
    });
  });

  it('parses --role and --create', () => {
    expect(parseArgs(['--email', 'a@b.com', '--role', 'staff', '--create'])).toEqual({
      email: 'a@b.com',
      role: 'staff',
      create: true,
    });
  });

  it('parses = separated flags', () => {
    expect(parseArgs(['--email=a@b.com', '--role=admin'])).toMatchObject({
      email: 'a@b.com',
      role: 'admin',
    });
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Tomas@Example.COM ')).toBe('tomas@example.com');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('findUserByEmail', () => {
  const users = [
    { id: 'u1', email: 'Angel@Example.com' },
    { id: 'u2', email: 'tomas@example.com' },
  ];

  it('matches case-insensitively', () => {
    expect(findUserByEmail(users, 'ANGEL@example.com')).toEqual({
      id: 'u1',
      email: 'Angel@Example.com',
    });
  });

  it('returns null when there is no match', () => {
    expect(findUserByEmail(users, 'nobody@example.com')).toBeNull();
  });
});

describe('buildMembershipRow', () => {
  it('builds an active, non-deleted membership row', () => {
    expect(buildMembershipRow({ organizationId: 'org-1', userId: 'u1', role: 'admin' })).toEqual({
      organization_id: 'org-1',
      user_id: 'u1',
      role: 'admin',
      status: 'active',
      deleted_at: null,
    });
  });
});
