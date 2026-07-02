import { afterEach, describe, expect, it, vi } from 'vitest';

import { getConfiguredOrganizationId, hasSupabaseConfig } from './supabase';

const organizationUuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function stubSupabaseEnv({
  key = 'publishable-key',
  organizationId = organizationUuid,
  url = 'https://example.supabase.co',
}: { key?: string; organizationId?: string; url?: string } = {}) {
  vi.stubEnv('VITE_SUPABASE_URL', url);
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key);
  vi.stubEnv('VITE_MONSTERLY_ORGANIZATION_ID', organizationId);
}

describe('Supabase configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports config when url, publishable key, and organization uuid are set', () => {
    stubSupabaseEnv();

    expect(hasSupabaseConfig()).toBe(true);
  });

  it.each([
    ['url', { url: '' }],
    ['publishable key', { key: '' }],
    ['organization id', { organizationId: '' }],
  ])('reports missing config when the %s is absent', (_name, overrides) => {
    stubSupabaseEnv(overrides);

    expect(hasSupabaseConfig()).toBe(false);
  });

  it.each(['local-demo-organization', 'demo-1', 'not-a-uuid'])(
    'rejects non-uuid organization id %s',
    (organizationId) => {
      stubSupabaseEnv({ organizationId });

      expect(getConfiguredOrganizationId()).toBeUndefined();
      expect(hasSupabaseConfig()).toBe(false);
    },
  );

  it('trims and lowercases the configured organization uuid', () => {
    stubSupabaseEnv({ organizationId: ` ${organizationUuid.toUpperCase()} ` });

    expect(getConfiguredOrganizationId()).toBe(organizationUuid);
  });
});
