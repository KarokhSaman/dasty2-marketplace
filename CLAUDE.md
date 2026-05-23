<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## i18n (Paraglide JS)

Three locales: `en` (default, LTR), `ckb` (Central Kurdish, RTL), `ar` (Arabic, RTL).

**Adding a translation key:**

1. Add the key to all three files in `messages/{en,ckb,ar}.json`. Use ICU positional placeholders for interpolation (e.g. `"otpSent": "Code sent to {phone}"`).
2. The Vite plugin re-runs the Paraglide compiler on save, regenerating `src/paraglide/`. Reference the key in code as `m.X()` or `m.X({ phone })`.
3. Run `npm run check:i18n` to verify all locales have the same key set — CI uses the same check.

**Routing:** locale-prefixed URLs. English unprefixed (`/products`), others prefixed (`/ckb/products`, `/ar/products`). The router's `rewrite` (in `src/router.tsx`) auto-localizes outbound `<Link>` hrefs based on current locale, and de-localizes incoming URLs for flat route matching. Cookie `dasty2-lang` is the persistence hint; `paraglideMiddleware` (in `src/server.ts`) issues 307 redirects when cookie/Accept-Language doesn't match the URL.

**RTL:** use Tailwind logical classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`) instead of `ml-`/`mr-`/`left-`/`right-`/`text-left`/etc. `<html dir>` is set in `__root.tsx` via `getTextDirection(locale)`.

**Never re-add `lib/i18n/`** — that was the old custom Context provider; it's gone.

## Deploying (Cloudflare Workers)

Hosted on Cloudflare Workers — project name `dasty2mndalan` (`wrangler.jsonc`). Custom server entry is `src/server.ts` (keeps the paraglide locale-redirect middleware around `createStartHandler`).

- `npm run deploy` — builds with Vite + `@cloudflare/vite-plugin` and uploads via `wrangler deploy`.
- `npm run preview` — previews the built bundle locally on miniflare.
- `npm run cf-typegen` — regenerates `worker-configuration.d.ts` from `wrangler.jsonc` after binding/var changes.

**Secrets:** server-only values go in `.dev.vars` locally (see `.dev.vars.example`) and `wrangler secret put <NAME>` in production. Never put secrets in `wrangler.jsonc`. `VITE_*` public values continue to live in `.env`.

**Compatibility flag `nodejs_compat` is required** — the cloudinary SDK in `src/routes/api/upload.ts` relies on `Buffer`. Don't drop it.

Prerendering is enabled in `vite.config.ts` (`tanstackStart({ prerender: { enabled: true } })`) — build-time HTML is served as static assets; everything else is SSRed in the Worker.

