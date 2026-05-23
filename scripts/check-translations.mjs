#!/usr/bin/env node
// Fails CI when any locale is missing a key that another locale has.
// Run via `npm run check:i18n` (or as part of typecheck).
import { readdirSync, readFileSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const MESSAGES_DIR = 'messages'

const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'))
if (files.length < 2) {
  console.log('[check:i18n] only one locale file, nothing to compare')
  process.exit(0)
}

const locales = {}
for (const f of files) {
  const locale = basename(f, extname(f))
  const data = JSON.parse(readFileSync(join(MESSAGES_DIR, f), 'utf8'))
  // Strip the $schema directive — it's not a translation key.
  delete data.$schema
  locales[locale] = new Set(Object.keys(data))
}

// Union of all keys across all locales = the expected superset.
const union = new Set()
for (const set of Object.values(locales)) for (const k of set) union.add(k)

let missing = 0
for (const [locale, set] of Object.entries(locales)) {
  const gaps = [...union].filter((k) => !set.has(k))
  if (gaps.length === 0) continue
  missing += gaps.length
  console.error(`\n[check:i18n] ${locale}.json is missing ${gaps.length} key(s):`)
  for (const k of gaps) console.error(`  - ${k}`)
}

if (missing > 0) {
  console.error(`\n[check:i18n] FAIL — ${missing} missing translation(s) across ${files.length} locales`)
  process.exit(1)
}
console.log(`[check:i18n] OK — ${union.size} keys consistent across ${files.length} locales`)
