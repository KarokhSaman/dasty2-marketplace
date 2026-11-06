#!/usr/bin/env node
// Fails CI if a buyer-facing product could leak a private seller field.
//
// Every product sent to the public site goes through `toPublic` in
// convex/products.ts, which drops the private fields and keeps the rest. The
// danger is a NEW field added to the products table that nobody remembers to
// drop — it would ride along to every buyer's browser.
//
// This check reads the products table in convex/schema.ts and the `toPublic`
// function, and demands that every product field is either on the public
// allow-list below or dropped by `toPublic`. A field that is neither fails the
// build, with a message telling you to decide which it is.
//
// Run with `npm run check:privacy`. No database or network: it reads the source.

import { readFileSync } from 'node:fs'

const SCHEMA = 'convex/schema.ts'
const PRODUCTS = 'convex/products.ts'

// Fields a buyer is ALLOWED to see. Adding a product field means deciding,
// on purpose, whether it belongs here (safe to show everyone) or must be
// dropped by `toPublic` (private). Keep this list in sync on purpose.
const PUBLIC_FIELDS = new Set([
  'seq', 'title', 'description', 'category', 'brand', 'condition', 'price',
  'photos', 'mainPhotoIndex', 'storyCrop', 'status', 'city', 'featured',
  'featuredUntil', 'featuredAt', 'featuredPosition', 'pinned', 'pinnedUntil',
  'pinnedAt', 'views', 'approvedAt', 'dateAdded', 'dateSold', 'stock', 'salePrice',
])

// Fields we never want in a buyer's browser, checked explicitly as a backstop
// even though the allow-list above would already catch them.
const MUST_DROP = [
  'sellerId', 'sellerName', 'sellerPhone', 'profit', 'notes', 'approvedBy',
  'storeId', 'offerId', 'soldFromId', 'leadCount', 'lastLeadAt', 'followUpAt',
  'availabilityCheckedAt', 'soldReportedAt', 'soldElsewhereAt',
  'deleteRequestedAt', 'deleteRequestReason', 'deleteRequestFrom',
]

const fail = (msg) => { console.error(`[check:privacy] ✗ ${msg}`); process.exitCode = 1 }

// --- The product fields, from the products table in the schema ---------------
const schema = readFileSync(SCHEMA, 'utf8')
const tableStart = schema.indexOf('products: defineTable({')
const tableBody = schema.slice(tableStart, schema.indexOf('buyerLeads: defineTable('))
// Top-level field names: a word + colon at the table's indentation (4 spaces).
const productFields = [...tableBody.matchAll(/^ {4}([a-zA-Z_]\w*):/gm)].map((m) => m[1])
if (productFields.length < 10) {
  fail(`couldn't read the products table from ${SCHEMA} — this check needs fixing`)
}

// --- The fields toPublic drops (every destructured key except ...rest) -------
const products = readFileSync(PRODUCTS, 'utf8')
const fnStart = products.indexOf('const toPublic = ({')
const fnEnd = products.indexOf('}: Doc<"products">', fnStart)
if (fnStart === -1 || fnEnd === -1) {
  fail(`couldn't find the toPublic function in ${PRODUCTS} — this check needs fixing`)
  report()
}
// Each destructured key is the identifier right after `{` or a `,`. A key may
// be renamed (`sellerName: _sellerName`) to drop it; we want the real key on
// the left, not the `_alias`, so match only the start-of-entry identifier.
const destructure = products.slice(fnStart, fnEnd)
const dropped = new Set(
  [...destructure.matchAll(/[{,]\s*([a-zA-Z_]\w*)/g)]
    .map((m) => m[1])
    .filter((name) => name !== 'rest'),
)

// --- The checks --------------------------------------------------------------
// 1. Every product field is either shown on purpose or dropped on purpose.
for (const field of productFields) {
  if (!PUBLIC_FIELDS.has(field) && !dropped.has(field)) {
    fail(
      `product field "${field}" is new: it would be sent to every buyer.\n` +
      `   Decide one: add it to PUBLIC_FIELDS in this script (safe to show), or\n` +
      `   drop it in toPublic() in ${PRODUCTS} (private).`,
    )
  }
}

// 2. A field can't be on the public list AND dropped — that's a contradiction.
for (const field of PUBLIC_FIELDS) {
  if (dropped.has(field)) {
    fail(`"${field}" is in PUBLIC_FIELDS but toPublic drops it. Remove it from one.`)
  }
}

// 3. The known-private fields really are dropped.
for (const field of MUST_DROP) {
  if (!dropped.has(field)) {
    fail(`private field "${field}" is NOT dropped by toPublic — it would leak to buyers.`)
  }
}

report()

function report() {
  if (process.exitCode) {
    console.error('[check:privacy] buyer-facing product data may leak a private field (see above).')
    process.exit(1)
  }
  console.log(
    `[check:privacy] OK — ${productFields.length} product fields: ` +
    `${PUBLIC_FIELDS.size} public, ${dropped.size} kept private by toPublic.`,
  )
}
