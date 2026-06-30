# Monsterly

Offline-first PWA for gym and CrossFit subscription control.

This repository has been initialized from the product brief in
[`monsterly.md`](monsterly.md). The app is a Vite React SPA built with
TypeScript and managed with pnpm.

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

Monsterly uses a browser Supabase client configured with Vite environment
variables. Create a local `.env` file from `.env.example`:

```sh
cp .env.example .env
```

Set these values from the client Supabase project API settings:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Only use the public project URL and publishable key in the browser app. Never
add the service role key, JWT secret, database password, or other server-only
credentials to local frontend env files or host settings.

## Routing

Monsterly currently uses React Router browser routing. Static hosts must rewrite
unknown paths to `index.html` so direct visits like `/settings` load the app.
This repository includes placeholder fallback config for Vercel (`vercel.json`)
and Netlify-compatible static hosts (`public/_redirects`).

The fuller routing migration to React Router's `createBrowserRouter` is tracked
separately in EVL-83.
