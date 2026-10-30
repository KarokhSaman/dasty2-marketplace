// Post-deploy smoke check: assert the LIVE site actually targets the backend
// its environment declares.
//
// This exists because the failure it catches already happened in production —
// dasty2mndalan.com served a bundle pointing at the dev Convex deployment and
// the dev R2 bucket, and nothing noticed, because a deploy "succeeding" only
// means wrangler uploaded something.
//
//   node scripts/verify-deploy.mjs production https://mndallan.com

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
//
// Every script the site can load is checked, not just the entry bundle: the
// photo upload code is a lazy chunk, and a stale build once shipped the old
// storage host only there, so the entry bundle looked fine.
const ASSET_HOST = /[a-z0-9-]*assets\.(?:dasty2mndalan|mndallan)\.com/g;
const CONVEX_HOST = /[a-z0-9-]+\.convex\.(?:cloud|site)/g;
// Example hosts that ship inside libraries' docs strings, not real targets.
const IGNORED_CONVEX = new Set(["happy-otter-123.convex.cloud", "happy-otter-123.convex.site"]);

async function check() {
  let html;
  const scripts = new Map();
  try {
    html = await fetchText(origin);
    const entry = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!entry) return ["no client bundle referenced in the served HTML"];
    const queue = [...new Set(html.match(/\/assets\/[A-Za-z0-9_.-]+\.js/g) ?? [])];
    while (queue.length && scripts.size < 400) {
      const path = queue.shift();
      if (scripts.has(path)) continue;
      const js = await fetchText(new URL(path, origin).href);
      scripts.set(path, js);
      for (const m of js.match(/assets\/[A-Za-z0-9_.-]+\.js/g) ?? []) queue.push(`/${m}`);
    }
  } catch (err) {
    return [err.message];
  }

  const failures = [];
  const found = (re) => {
    const hosts = new Map();
    for (const [path, js] of scripts) {
      for (const host of js.match(re) ?? []) if (!hosts.has(host)) hosts.set(host, path);
    }
    return hosts;
  };

  const convex = found(CONVEX_HOST);
  for (const host of IGNORED_CONVEX) convex.delete(host);
  const wrongConvex = [...convex.keys()].filter((h) => h.split(".")[0] !== expectedConvex.split(".")[0]);
  if (!convex.has(expectedConvex)) {
    failures.push(`Convex: expected ${expectedConvex}, scripts reference ${[...convex.keys()].join(", ") || "none"}`);
  }
  for (const host of wrongConvex) failures.push(`Convex: ${convex.get(host)} references ${host}`);

  // An empty VITE_R2_PUBLIC_URL degrades to relative "/categories/*.png" rather
  // than erroring, so check the positive case explicitly, and that no script
  // carries any other storage host (the old domain no longer resolves).
  const r2 = found(ASSET_HOST);
  if (!r2.has(expectedR2) && !html.includes(`https://${expectedR2}`)) {
    failures.push(`R2: expected ${expectedR2}, scripts reference ${[...r2.keys()].join(", ") || "relative paths (unset at build time)"}`);
  }
  for (const [host, path] of r2) {
    if (host !== expectedR2) failures.push(`R2: ${path} references ${host}, expected ${expectedR2}`);
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
    console.log(`✓ ${origin} targets ${expectedConvex} and ${expectedR2} in every script`);
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
