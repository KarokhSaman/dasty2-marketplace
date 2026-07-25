# Dasty2 Mndalan — Marketplace

A second-hand marketplace for Iraqi Kurdistan, built with TanStack Start and deployed on Cloudflare Workers.

## Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (React, file-based routing, SSR)
- **Backend** — [Convex](https://convex.dev) (real-time database, mutations, queries)
- **Auth** — [VerifySpeed](https://verifyspeed.com) phone-OTP (WhatsApp/Telegram/SMS) + self-hosted RS256 session JWT verified by Convex
- **Styling** — Tailwind CSS v4
- **i18n** — [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) (English, Kurdish Sorani, Arabic)
- **Images** — Cloudflare R2 (via `@convex-dev/r2`)
- **Deployment** — [Cloudflare Workers](https://workers.cloudflare.com)

## Local Development

```bash
npm install
npm run dev
```

Requires a `.env.local` file — copy `.env.example`, fill in the local values, and keep deployed Worker runtime secrets in Cloudflare.

## Convex

```bash
# Start the Convex dev server (watches for schema/function changes)
npx convex dev
```

### Development mock accounts

Local Vite builds expose clearly labeled mock seller/admin buttons on their
login pages. Enable the backend half only on the Convex development deployment:

```bash
npx convex env set ALLOW_MOCK_AUTH true
```

The deterministic identities are the mock seller (`+9647000000001`) and
`Codex QA Admin` (`+9647000000002`). They have no passwords. Each mock seller
login resets that seller to the registration-only state and opens the
complete-profile step; the mock admin stays ready to use. The UI/API route is
compiled out of production behavior, and Convex independently rejects the
shortcut unless the flag is explicitly enabled.

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
