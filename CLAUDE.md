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

**Secrets:** local values go in `.env.local`, following `.env.example`. In production, configure Worker runtime values/secrets in Cloudflare (`wrangler secret put <NAME>` or the dashboard). Never put secret values in `wrangler.jsonc`; `VITE_*` public values must exist at build time.

**Compatibility flag `nodejs_compat` is required** — Worker-side dependencies rely on Node built-ins. Don't drop it.

## Image storage (Cloudflare R2)

Product photos and category icons live in Cloudflare R2 via the `@convex-dev/r2` component (`convex/r2.ts`, `convex/convex.config.ts`). Uploads go **directly** from the browser to R2 through a Convex-signed URL (`useUploadFile` in `lib/useImageUpload.js`) — there is no server upload route. The returned object key is composed into a permanent public URL (`VITE_R2_PUBLIC_URL` + `/` + key) and stored as a plain string in `products.photos`.

- R2 credentials (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_ENDPOINT`/`R2_BUCKET`) and `R2_PUBLIC_URL` live in **Convex** env (per deployment), not in `wrangler.jsonc`.
- `VITE_R2_PUBLIC_URL` (client, in `.env.local` locally and build variables in Cloudflare) is the bucket's public custom domain, e.g. `https://dev-assets.dasty2mndalan.com`.
- Browser uploads require a **CORS policy on the R2 bucket** allowing `PUT` from the app origin.
- File type/size are validated client-side in `lib/useImageUpload.js` (the file no longer passes through a server route).

Pages are SSR-rendered by the Worker. Do not enable TanStack prerendering unless the Cloudflare build environment has every server runtime secret required by middleware such as Clerk.
