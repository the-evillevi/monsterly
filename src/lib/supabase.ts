import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const missingEnvVars = [
      supabaseUrl ? null : 'VITE_SUPABASE_URL',
      supabasePublishableKey ? null : 'VITE_SUPABASE_PUBLISHABLE_KEY',
    ].filter(Boolean);

    throw new Error(`Missing Supabase environment variables: ${missingEnvVars.join(', ')}`);
  }

  supabaseClient ??= createClient(supabaseUrl, supabasePublishableKey, {
    // PKCE is the flow for browser OAuth: the callback carries a `?code=` that
    // the singleton client exchanges for a session. The other auth defaults
    // (localStorage persistSession, autoRefreshToken, detectSessionInUrl) are
    // already what we want.
    auth: { flowType: 'pkce' },
  });

  return supabaseClient;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getConfiguredOrganizationId(): string | undefined {
  const organizationId = import.meta.env.VITE_MONSTERLY_ORGANIZATION_ID?.trim();

  if (!organizationId || !uuidPattern.test(organizationId)) {
    return undefined;
  }

  return organizationId.toLowerCase();
}

export function hasSupabaseConfig() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY &&
    getConfiguredOrganizationId(),
  );
}

/**
 * Whether the app must gate access behind a Google sign-in. Fails closed: any
 * value other than the explicit `anon` opt-out (unset, typo, empty) keeps auth
 * required, so a misconfigured prod deploy never silently drops the gate.
 * Local dev opts out on purpose via `VITE_MONSTERLY_AUTH_MODE=anon`, which
 * pairs with the permissive anon grants in `supabase/seed.sql`. Demo mode
 * (no Supabase config) is never gated.
 */
export function isAuthRequired() {
  return hasSupabaseConfig() && import.meta.env.VITE_MONSTERLY_AUTH_MODE !== 'anon';
}
