// Deploys run from CI only.
//
// A local `npm run deploy:prod` still lets Vite read `.env.local`, so a
// developer's dev Convex/R2 URLs get baked into `import.meta.env` and shipped
// to production. That is exactly how dasty2mndalan.com ended up serving
// dev-assets.dasty2mndalan.com. CI has no .env.local, so its builds are
// reproducible.
//
// Override with ALLOW_LOCAL_DEPLOY=1 for a deliberate break-glass deploy.

if (!process.env.CI && process.env.ALLOW_LOCAL_DEPLOY !== "1") {
  console.error(`
✗ Deploys run from CI, not from a laptop.

  Push to a branch instead:
    development → dasty2-marketplace-dev  (dev.dasty2mndalan.com)
    main        → dasty2-marketplace-pro  (dasty2mndalan.com)

  Or trigger one manually:
    gh workflow run Deploy -f environment=dev
    gh workflow run Deploy -f environment=prod

  A local build reads .env.local and would bake your local Convex/R2 URLs
  into the deployed bundle. If you truly need to override:
    ALLOW_LOCAL_DEPLOY=1 npm run deploy:prod
`);
  process.exit(1);
}
