import type { SupabaseClient } from '@supabase/supabase-js';

export type MembershipRole = 'admin' | 'staff';

/**
 * Result of an active-membership check. `unknown` is a network failure (the
 * check could not run), distinct from `denied` (the check ran and returned no
 * row). The gate treats them differently: `denied` signs the user out, while
 * `unknown` falls back to the offline membership cache.
 */
export type MembershipResult =
  { outcome: 'member'; role: MembershipRole } | { outcome: 'denied' } | { outcome: 'unknown' };

type CachedMembership = {
  ok: boolean;
  role: MembershipRole | null;
  verifiedAt: string;
};

const cachePrefix = 'monsterly-membership:';

function membershipCacheKey(organizationId: string, userId: string) {
  return `${cachePrefix}${organizationId}:${userId}`;
}

// localStorage can be missing or throw (privacy modes). A missing store just
// means the offline no-lockout path has nothing to fall back on until the next
// successful online check.
function getMembershipStorage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Query the configured organization for an active, non-deleted membership row
 * for the given user. RLS returns zero rows (no error) for an authenticated
 * non-member ⇒ `denied`; only a network/transport failure yields an error ⇒
 * `unknown`.
 */
export async function checkMembership(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<MembershipResult> {
  const { data, error } = await client
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { outcome: 'unknown' };
  }

  if (!data) {
    return { outcome: 'denied' };
  }

  return { outcome: 'member', role: data.role as MembershipRole };
}

export function readMembershipCache(
  organizationId: string,
  userId: string,
): CachedMembership | null {
  const storage = getMembershipStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(membershipCacheKey(organizationId, userId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedMembership;

    return typeof parsed?.ok === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMembershipCache(
  organizationId: string,
  userId: string,
  value: CachedMembership,
) {
  const storage = getMembershipStorage();

  try {
    storage?.setItem(membershipCacheKey(organizationId, userId), JSON.stringify(value));
  } catch {
    // Best-effort: a failed write only costs the offline no-lockout fallback.
  }
}

/**
 * Remove a cached membership. With both ids, clears that one entry; with no
 * arguments, clears every cached membership (used on sign-out for a clean
 * slate regardless of which user was signed in).
 */
export function clearMembershipCache(organizationId?: string, userId?: string) {
  const storage = getMembershipStorage();

  if (!storage) {
    return;
  }

  try {
    if (organizationId && userId) {
      storage.removeItem(membershipCacheKey(organizationId, userId));
      return;
    }

    // Collect first: removing during iteration shifts the index.
    const keys: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key?.startsWith(cachePrefix)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Best-effort.
  }
}
