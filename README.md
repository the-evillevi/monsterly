# MythOS

Offline-first PWA for gym and CrossFit subscription control.

This repository has been initialized from the product brief in
[`monsterly.md`](monsterly.md) (the app was renamed from Monsterly to MythOS;
internal identifiers — env vars, storage keys, database names — keep the
`monsterly` prefix on purpose so existing local data is never orphaned). The
app is a Vite React SPA built with TypeScript and managed with pnpm.

## Development

Install dependencies:

```sh
pnpm install
```

Start the local development server:

```sh
pnpm dev
```

Create a production build:

```sh
pnpm build
```

## Supabase setup

MythOS uses a browser Supabase client configured with Vite environment
variables. Create a local `.env` file from `.env.example`:

```sh
cp .env.example .env
```

Set these values from the client Supabase project API settings:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MONSTERLY_ORGANIZATION_ID=
```

`VITE_MONSTERLY_ORGANIZATION_ID` must be the UUID of the organization to sync.
Without all three values, the app stays in offline demo mode and Supabase
replication never starts.

Only use the public project URL and publishable key in the browser app. Never
add the service role key, JWT secret, database password, or other server-only
credentials to local frontend env files or host settings.

## Authentication

Production requires a Google sign-in with an active row in
`organization_members` before it syncs (invite-only; RLS scopes every table to
the `authenticated` role). This is controlled by `VITE_MONSTERLY_AUTH_MODE`:

```sh
# Local dev only — pairs with the anon grants in supabase/seed.sql so
# `supabase start` needs no Google credentials. NEVER set this in production.
VITE_MONSTERLY_AUTH_MODE=anon
```

Leave the variable unset in production (and in Vercel): the app then fails
closed and requires sign-in. Demo mode (no Supabase config) is never gated.

### Pre-granting operators before a deploy

Because prod starts with zero memberships, grant the operators access up front
so nobody hits the "Sin acceso" screen. With the service-role key (server-side
only — never in the frontend env):

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MONSTERLY_ORGANIZATION_ID=<org uuid> \
  node scripts/grant-membership.mjs --email <gmail> --role admin --create
```

`--create` pre-creates the auth user by email; Google auto-links its identity on
the operator's first OAuth sign-in (verified email). The command is idempotent
and revives inactive/soft-deleted rows, so it is safe to re-run.

**Recovery hatch:** membership is plain data. If anyone is ever locked out, the
service-role key plus the Dashboard SQL editor bypass RLS — one upsert (or a
re-run of the script) restores access. The app can never lock an operator out
of the database itself, and the installed PWA keeps working offline from its
cached membership when the network check can't run.

## Routing

MythOS currently uses React Router browser routing. Static hosts must rewrite
unknown paths to `index.html` so direct visits like `/settings` load the app.
This repository includes placeholder fallback config for Vercel (`vercel.json`)
and Netlify-compatible static hosts (`public/_redirects`).

The fuller routing migration to React Router's `createBrowserRouter` is tracked
separately in EVL-83.
