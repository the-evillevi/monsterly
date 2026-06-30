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

## Routing

Monsterly currently uses React Router browser routing. Static hosts must rewrite
unknown paths to `index.html` so direct visits like `/settings` load the app.
This repository includes placeholder fallback config for Vercel (`vercel.json`)
and Netlify-compatible static hosts (`public/_redirects`).

The fuller routing migration to React Router's `createBrowserRouter` is tracked
separately in EVL-83.
