# Marketplace End-to-End Test Report — 2026-07-25

**Executed:** 2026-07-25
**Environment:** Local TanStack/Vite app on `http://localhost:3000` with the configured Convex development deployment
**Browser:** Codex internal browser, desktop default viewport and a temporary 390×844 mobile viewport
**Scope:** Public browsing, localization, responsive layouts, mock first registration, seller profile/account, listing creation/edit/repost, moderation, seller activation, product approval/feature/sold/paid/delete, notifications, admin roles/logs/offers, guards, malformed routes/APIs, persistence, and cleanup

## Outcome

The executable test matrix completed with four material defects, six smaller
UI/accessibility defects, and two internal-browser boundaries. Static checks and
the production client/SSR build pass.

The most serious defect is data-integrity related: a repost reuses the original
product's Convex storage URL. Deleting the repost deletes that shared object and
leaves the still-approved original with a `404` image URL.

The synthetic lifecycle ended cleanly. Products `26-0082` and `26-0083`, their
linked notifications, the feature record, and the uploaded Convex storage object
were removed. The product table returned from 82/83 during the test to its
pre-test count of 81. No existing marketplace product, seller, admin, or offer
was deleted or permanently changed.

## Coverage

| Area | Checks | Result |
| --- | --- | --- |
| Public home | SSR/client render, 32 visible desktop cards, navigation, images, no horizontal overflow | Pass |
| Search | Presence of home search and no-results journey | **Fail — search UI is absent** |
| Filters | Category, condition, combined filter, sort menu, reset | Pass |
| Product detail | Media, price, condition, category, code, description, WhatsApp/share target, related products | Pass |
| Invalid public product | `/en/products/not-an-id` | Pass — controlled “Product not found” |
| Buyer account | Start Selling, How It Works, About expansion, fees/contact UI | Pass |
| English | Localized routes, `lang="en"`, LTR | Pass |
| Arabic | Direct deep link, translated content, `lang="ar"`, RTL, no overflow | Pass |
| Kurdish | Locale switch, root routes, translated navigation, RTL | Pass |
| Mobile | 390×844 home/product/navigation/CTA, no overflow | Pass |
| Signed-out seller guard | `/en/seller/add` redirects to `/en/seller/login` | Pass |
| Seller OTP form | Short-phone guard, WhatsApp/Telegram/SMS method picker | Pass to live OTP boundary |
| Mock first registration | Deterministic seller registration without completed profile | Pass |
| Profile form | Required name/address, city, disabled/enabled Continue, persistence | Pass |
| Incomplete-profile guard | Direct dashboard/account access before completion | **Fail — protected pages are accessible** |
| Seller account | Read-only verified phone, address edit and persistence, logout | Pass |
| Listing validation | Empty form, price min/max, required photo | Pass, with stale-message defect |
| Listing upload | One PNG through the browser file chooser into Convex development storage | Pass |
| Listing create/edit | Pending submission, dashboard count, edit title/price, resubmit | Pass |
| Listing repost | Prefilled fields/media, new pending record, dashboard counts | Pass |
| Repost deletion | Delete confirmation and record cleanup | **Fail — breaks original image storage** |
| Invalid seller edit | `/en/seller/products/not-an-id/edit` | **Fail — raw Convex error boundary** |
| Admin auth | Mock admin login, reload persistence, logout | Pass |
| Admin role guard | Seller blocked from `/en/admin`; ordinary admin has no peer-admin mutation controls | Pass |
| Admin dashboard | Counts, activity summary, links | Pass |
| Admin products | Pending/approved/sold/paid filters, title/code search, confirmation dialogs | Pass |
| Moderation | Pending → approved → featured → sold → paid → deleted | Pass |
| Seller notifications | Approval and Sold in UI; Paid in backend after browser-policy boundary | Pass with noted boundary |
| Public lifecycle | Approved is public; Sold/Paid/deleted route becomes controlled not-found | Pass |
| Seller activation | Deactivate/activate confirmation, state change, restore Active | Pass |
| Admin sellers | Search, detail, products count, activation actions | Pass, with copy defect |
| Admin admins | Search, current/peer details, ordinary-admin restrictions | Pass |
| Admin logs | Approval, feature, seller deactivate/activate, Sold, Paid, Delete | Pass |
| Admin offers | Empty state, required-field blocking, fee-type switch | Partial — native date boundary |
| Unknown route | `/en/admin/not-a-route` | Pass — 404 page |
| Auth API negatives | Malformed/empty send OTP, empty verify OTP, invalid mock role | Pass — controlled `400` |
| Static regression | TypeScript, translations, production client/SSR build, diff check | Pass |
| Synthetic cleanup | Products, notifications, feature, storage object | Pass |

## Material Defects

### 1. Repost deletion breaks the original product image

**Severity:** High
**Area:** Product data integrity / media lifecycle

Steps:

1. Create and approve product `26-0082`
   (`j574nyte42hdyp593b596c1sbx8b6nhk`) with one Convex development-storage
   image.
2. Repost it from the seller dashboard.
3. Confirm new pending product `26-0083`
   (`j575b8r2e6k00a2b81q2nze72d8b65d8`) is created.
4. Inspect the backend: both records contain the exact same photo URL:
   `https://trustworthy-dodo-766.convex.cloud/api/storage/b1525edd-4715-4986-8387-401b3da9524e`.
5. Delete pending repost `26-0083` through the seller UI.
6. Request the original image URL without relying on the browser cache.

Observed:

- The storage URL returns HTTP `404`.
- Original `26-0082` remained approved and continued referencing the deleted
  object.
- The already-open browser could display a cached copy, hiding the problem from
  the current operator while new visitors would receive a broken image.

Expected:

- A repost must own independent storage objects, or storage deletion must be
  reference-aware and retain an object while any product references it.

### 2. Incomplete seller profiles can bypass onboarding

**Severity:** High
**Area:** Seller authorization / onboarding invariant

Steps:

1. Use “Continue as mock seller”.
2. Verify navigation to `/en/seller/complete-profile` with empty name/address.
3. Directly open `/en/seller` and `/en/seller/account` without submitting the
   profile.

Observed:

- Both protected seller pages load.
- The dashboard provides seller-management access.
- The account view renders with missing profile data.

Expected:

- An authenticated seller whose required profile is incomplete must remain
  redirected to the complete-profile step for all seller-management routes.

### 3. Home search has regressed out of the UI

**Severity:** High
**Area:** Public product discovery

Observed:

- The English home page renders no input element.
- `src/pages/home.jsx` has no rendered `SearchInput` or equivalent search state.
- The exact-title and no-results flows documented as passing on 2026-07-23 are
  no longer available.

Expected:

- An accessible search field should filter products, expose a controlled empty
  state, and support reset/clear behavior.

### 4. Malformed seller edit IDs expose a raw backend validation error

**Severity:** Medium
**Area:** Error handling

Route:

`/en/seller/products/not-an-id/edit`

Observed:

- The global error boundary renders.
- The page exposes a raw Convex `ArgumentValidationError` for
  `v.id("products")`.
- Browser console errors are produced.

Expected:

- Normalize the string ID before the typed product query and render a controlled
  not-found or unauthorized state, matching the public product route.

## Smaller Defects

1. After a valid photo upload, the listing form continues displaying
   “At least one photo is required” until submit.
2. Admin product cards render `likenew` products as **Used**. The component maps
   only `new` specially and treats all other values as Used.
3. The Admin Sellers search field is labeled/placeholdered “Search products…”.
4. The Admin Products search placeholder uses example `DS-0001`, while displayed
   product codes use the `26-0081` format. Search itself works with the displayed
   code.
5. Several icon-only controls have no accessible name, including the seller
   profile edit control and the notification-panel close control.
6. Seller-shell “Sell Now” links use `/seller/add` while English dashboard/account
   links preserve `/en/`; the locale contract is inconsistent.

## Boundaries and Safely Skipped Mutations

- A real VerifySpeed OTP was not requested or verified.
- WhatsApp links were inspected but not opened and no message was sent.
- Super-admin promotion/removal and deletion of existing accounts were not
  performed.
- The offer form’s native end-date input displayed a filled value through the
  automation API but did not commit it to React state. A rerender cleared it and
  the required-field guard correctly blocked submission. Required validation,
  fee-type selection, and the no-active-offer state were verified; offer
  creation/deactivation/reactivation/deletion were not mutated.
- After Admin marked the product Paid, the internal browser URL policy blocked
  the seller-profile continuation navigation. The backend product row and the
  unread seller notification were verified directly:
  `status: "paid"` and
  `Your payment for "Codex QA Full Flow 20260725 Edited" has been processed!`.
- The Rejected branch was not separately mutated after the browser-policy
  boundary because doing so required another seller-created synthetic record.
  The same admin confirmation/status mechanism passed for Approved, Sold, and
  Paid.

## Static and API Results

```text
npm run typecheck
PASS

npm run check:i18n
PASS — 265 keys consistent across 3 locales

npm run build
PASS — production client and SSR bundles

git diff --check
PASS

POST /api/auth/send-otp with malformed JSON
400 {"error":"bad_request"}

POST /api/auth/send-otp with {}
400 {"error":"bad_request"}

POST /api/auth/verify-otp with {}
400 {"error":"bad_request"}

POST /api/auth/mock-login with {"role":"buyer"}
400 {"error":"bad_request"}

GET /, /en/account, /en/products/not-an-id, /sitemap.xml
200
```

## Cleanup Evidence

- Final product counts: 81 total, 1 pending, 80 approved, 0 rejected, 0 sold,
  0 paid.
- Backend search returns no `26-0082`, `26-0083`, synthetic title, or synthetic
  product IDs.
- Backend notification search returns no notification linked to either synthetic
  product.
- The exact uploaded storage URL returns `404`.
- The deleted public product route renders controlled “Product not found”.
- The reusable development mock seller remains Active with its completed
  profile; no existing account was removed.

## Working Tree Note

The browser test did not modify application source. Before this report was
added, the working tree already contained the requested mock-onboarding changes
in:

- `README.md`
- `convex/users.ts`
- `src/components/auth/MockLoginButton.jsx`
