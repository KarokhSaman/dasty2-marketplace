// Post-deploy smoke check: assert the LIVE site actually targets the backend
// its environment declares.
//
// This exists because the failure it catches already happened in production —
// dasty2mndalan.com served a bundle pointing at the dev Convex deployment and
// the dev R2 bucket, and nothing noticed, because a deploy "succeeding" only
// means wrangler uploaded something.
//
//   node scripts/verify-deploy.mjs production https://dasty2mndalan.com

import { readFileSync } from "node:fs";

const [target, origin] = process.argv.slice(2);
if (!target || !origin) {
  console.error("usage: verify-deploy.mjs <production|dev> <origin>");
  process.exit(1);
}

const raw = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const vars = JSON.parse(raw).env?.[target]?.vars;
if (!vars) {
  console.error(`✗ wrangler.jsonc has no env.${target}`);
  process.exit(1);
}

const expectedConvex = new URL(vars.VITE_CONVEX_URL).host;
const expectedR2 = new URL(vars.VITE_R2_PUBLIC_URL).host;

// A fresh deploy takes a few seconds to propagate to every edge colo.
async function fetchWithRetry(url, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
      if (res.ok) return await res.text();
      console.error(`  attempt ${i}: HTTP ${res.status}`);
    } catch (err) {
      console.error(`  attempt ${i}: ${err.message}`);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`could not fetch ${url} after ${attempts} attempts`);
}

async function check() {
  const html = await fetchWithRetry(origin);

  const bundlePath = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!bundlePath) return ["could not find the client bundle in the served HTML"];
  const bundle = await fetchWithRetry(new URL(bundlePath, origin).href);

  const failures = [];

  const convexHosts = [...new Set(bundle.match(/[a-z0-9-]+\.convex\.(?:cloud|site)/g) ?? [])];
  if (!convexHosts.some((host) => host === expectedConvex)) {
    failures.push(`Convex: expected ${expectedConvex}, bundle references ${convexHosts.join(", ") || "none"}`);
  }

  // An empty VITE_R2_PUBLIC_URL degrades to relative "/categories/*.png" rather
  // than erroring, so check the positive case explicitly. Anchor on the scheme:
  // bare "assets.dasty2mndalan.com" is a substring of the dev bucket's hostname.
  if (!html.includes(`https://${expectedR2}`)) {
    const otherR2 = [...new Set(html.match(/[a-z0-9-]*assets\.dasty2mndalan\.com/g) ?? [])];
    failures.push(`R2: expected ${expectedR2}, HTML references ${otherR2.join(", ") || "relative paths (unset at build time)"}`);
  }

  return failures;
}

// A just-uploaded Worker takes a few seconds to reach every edge colo, so a
// successful fetch of the PREVIOUS bundle is an expected transient state, not a
// failure. Retry the whole check — not just the fetch — before giving up.
let failures = [];
for (let attempt = 1; attempt <= 6; attempt++) {
  failures = await check();
  if (!failures.length) {
    console.log(`✓ ${origin} targets ${expectedConvex} and ${expectedR2}`);
    process.exit(0);
  }
  if (attempt < 6) {
    console.error(`  attempt ${attempt}: still propagating, retrying in 10s`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

console.error(`\n✗ ${origin} does not match env.${target}:`);
for (const failure of failures) console.error(`  - ${failure}`);
process.exit(1);
