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

async function fetchText(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

// Returns a list of mismatches; [] means the live site matches. Any transient
// error is reported as a mismatch so the caller retries rather than aborting:
// the Worker script and its static assets propagate independently, so the HTML
// can briefly reference a bundle hash the edge cannot serve yet (HTTP 404).
async function check() {
  let html;
  let bundle;
  let bundlePath;
  try {
    html = await fetchText(origin);
    bundlePath = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!bundlePath) return ["no client bundle referenced in the served HTML"];
    bundle = await fetchText(new URL(bundlePath, origin).href);
  } catch (err) {
    return [err.message];
  }

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

// A just-uploaded Worker takes time to reach every edge colo, and its static
// assets propagate separately from the script, so serving the PREVIOUS bundle
// or 404ing the new one are both expected transient states. Retry the whole
// check — not just the fetch — before calling a deploy bad.
const ATTEMPTS = 10;
const DELAY_MS = 15_000;

let failures = [];
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  failures = await check();
  if (!failures.length) {
    console.log(`✓ ${origin} targets ${expectedConvex} and ${expectedR2}`);
    process.exit(0);
  }
  if (attempt < ATTEMPTS) {
    console.error(`  attempt ${attempt}/${ATTEMPTS}: ${failures[0]} — retrying in ${DELAY_MS / 1000}s`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

console.error(`\n✗ ${origin} does not match env.${target}:`);
for (const failure of failures) console.error(`  - ${failure}`);
process.exit(1);
