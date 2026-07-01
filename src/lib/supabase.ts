import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  const missingEnvVars = [
    supabaseUrl ? null : 'VITE_SUPABASE_URL',
    supabasePublishableKey ? null : 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean);

  throw new Error(`Missing Supabase environment variables: ${missingEnvVars.join(', ')}`);
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
