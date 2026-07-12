/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Millisecond build timestamp injected by vite.config.ts `define`.
declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_MONSTERLY_ORGANIZATION_ID?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
