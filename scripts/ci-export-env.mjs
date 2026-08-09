// Emit the VITE_* build values for one wrangler environment as KEY=value lines,
// for appending to $GITHUB_ENV.
//
// VITE_* values are inlined into the client bundle by Vite at build time, so
// they must be present in the build process env. They were previously supplied
// (partially) by GitHub secrets, which drifted from wrangler.jsonc: the CI dev
// build shipped an empty VITE_R2_PUBLIC_URL, and a laptop-built production
// bundle shipped the developer's dev URLs. wrangler.jsonc is the single source
// of truth; this script is how CI reads it.
//
//   node scripts/ci-export-env.mjs production >> "$GITHUB_ENV"

import { readFileSync } from "node:fs";

const target = process.argv[2];
if (!target) {
  console.error("usage: ci-export-env.mjs <production|dev>");
  process.exit(1);
}

// Tolerate JSONC comments; string literals here never contain // or /*.
const raw = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const config = JSON.parse(raw);
const envConfig = config.env?.[target];
if (!envConfig) {
  console.error(`✗ wrangler.jsonc has no env.${target}`);
  process.exit(1);
}

const vars = envConfig.vars ?? {};
const required = ["VITE_CONVEX_URL", "VITE_CONVEX_SITE_URL", "VITE_R2_PUBLIC_URL"];
const missing = required.filter((key) => !vars[key]);
if (missing.length) {
  console.error(`✗ env.${target}.vars is missing: ${missing.join(", ")}`);
  process.exit(1);
}

// Fail loudly rather than shipping a bundle that silently points at the wrong
// backend — the failure mode this whole script exists to prevent.
for (const [key, value] of Object.entries(vars)) {
  if (!key.startsWith("VITE_")) continue;
  if (String(value).includes("\n")) {
    console.error(`✗ ${key} contains a newline; refusing to write to GITHUB_ENV`);
    process.exit(1);
  }
  console.log(`${key}=${value}`);
}

console.error(`✓ ${target}: ${required.map((k) => `${k}=${vars[k]}`).join("  ")}`);
