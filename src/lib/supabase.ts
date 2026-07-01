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

export function hasSupabaseConfig() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseClient(), property, receiver);
  },
});
