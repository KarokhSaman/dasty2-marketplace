# Dasty2 Mndalan — Marketplace

A second-hand marketplace for Iraqi Kurdistan, built with TanStack Start and deployed on Cloudflare Workers.

## Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (React, file-based routing, SSR)
- **Backend** — [Convex](https://convex.dev) (real-time database, mutations, queries)
- **Auth** — [Clerk](https://clerk.com) (email sign-up/sign-in for sellers)
- **Styling** — Tailwind CSS v4
- **i18n** — [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) (English, Kurdish Sorani, Arabic)
- **Images** — Cloudinary
- **Deployment** — [Cloudflare Workers](https://workers.cloudflare.com)

## Local Development

```bash
npm install
npm run dev
```

Requires a `.env.local` file — copy `.dev.vars.example` for server-side secrets and set `VITE_*` variables for client-side config.

## Convex

```bash
# Start the Convex dev server (watches for schema/function changes)
npx convex dev
```

## Deployment

```bash
# Deploy to the dev Cloudflare Worker (uses dev Convex)
npm run deploy:dev

# Deploy to the production Cloudflare Worker (uses prod Convex)
npm run deploy:prod
```

To deploy the Convex backend to production:

```bash
npx convex deploy --yes
```

## i18n

Three locales: `en` (default, LTR), `ckb` (Central Kurdish, RTL), `ar` (Arabic, RTL).

After adding keys to `messages/{en,ckb,ar}.json`, verify consistency:

```bash
npm run check:i18n
```
