<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Deploying

Read the "Deploying (Cloudflare Workers)" section of `CLAUDE.md` before touching
anything that deploys — `.github/workflows/deploy.yml`, `wrangler.jsonc`, the
`deploy:*` scripts, or `scripts/{assert-ci,ci-export-env,verify-deploy}.mjs`.

The short version:

- **Pushing a branch is what deploys.** `development` → `dasty2-marketplace-dev`
  (dev.dasty2mndalan.com); `main` → `dasty2-marketplace-pro`
  (dasty2mndalan.com). A push to `main` ships production immediately, so land
  work on `development` first unless you mean to release.
- **Deploys run from CI only.** `scripts/assert-ci.mjs` blocks a local
  `npm run deploy:*`. A laptop build inlines the `.env.local` Convex and R2 URLs
  into the bundle; that is how production once shipped on the dev backend.
- **`wrangler.jsonc` `env.*.vars` is the single source of truth for `VITE_*`.**
  CI reads it via `scripts/ci-export-env.mjs`. Never duplicate those values into
  GitHub secrets or the Cloudflare dashboard.
- **Do not reconnect Cloudflare Workers Builds** (Worker → Settings → Build). It
  was connected to `main` with dev values and overwrote every CI deploy about a
  minute later. If a deploy reverts shortly after CI goes green, check that
  first.
- **Verify before reporting success.** `node scripts/verify-deploy.mjs
  production https://dasty2mndalan.com` checks the live site, and CI runs it
  after every deploy. A green `wrangler deploy` only means an upload happened —
  re-check a few minutes later before calling a deploy done.
