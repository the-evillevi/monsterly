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

  supabaseClient ??= createClient(supabaseUrl, supabasePublishableKey);

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
