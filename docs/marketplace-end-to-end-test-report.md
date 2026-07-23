# Marketplace End-to-End Test and Fix Report

**Executed:** 2026-07-23
**Environment:** Local TanStack/Vite app on port 3002 with the configured Convex development deployment
**Plan:** `docs/marketplace-end-to-end-test-and-fix-plan.md`

## Outcome

All anonymous-buyer, signed-out, mock-seller, ordinary-admin, localization, responsive, listing-lifecycle, and protected-backend journeys in scope passed after fixes. The Convex development functions were deployed successfully.

Two deterministic development accounts were created and exercised through the same JWT/session/role guards as OTP-authenticated users. A synthetic listing was uploaded, submitted, approved, discovered through public search, opened, observed in the seller notification/dashboard, and deleted through the admin UI. The deletion also removed its related notifications and development image; the old public product and image URLs both returned `404`. The mock accounts remain available for future local QA, and all browser sessions were signed out.

## Executed Coverage

| Area | Checks | Result |
| --- | --- | --- |
| Home | SSR render, product cards, featured products, navigation, broken images, horizontal overflow | Pass |
| Search | Search by title, one-result state, impossible query, translated empty state, reset affordance | Pass after fix |
| Filters | Category, city, condition, brand empty state, sort, combined filters, reset | Pass |
| Product detail | Correct listing data, media, related area, WhatsApp target, locale-preserving share URL | Pass after fix |
| Invalid product | Direct malformed product ID | Pass after fix: controlled not-found page |
| Buyer account | Signed-out state, start-selling link, how-it-works, fees, About expansion, WhatsApp contact target | Pass after fix |
| Seller entry | `/seller/add` signed-out redirect, OTP methods, short-phone guard, malformed auth API requests | Pass to OTP boundary |
| Admin entry | `/admin` signed-out redirect, OTP form, seller-session cleanup on wrong-role admin login | Pass to OTP boundary |
| Mock seller auth | Deterministic account upsert, session cookie, role guard, reload/re-login, logout | Pass |
| Seller account | Seeded profile display, protected dashboard, listing counts, notification panel | Pass |
| Listing creation | Category/condition/price/description, image upload, submit-once success, pending dashboard | Pass after dev-storage fix |
| Admin auth | Deterministic admin session, protected dashboard, refresh/navigation, logout | Pass |
| Admin moderation | Product search/filter, approval confirmation, counts, sellers, admins, offers, audit log | Pass |
| Public listing lifecycle | Approved visibility, exact-title search, detail route, seller approval state and notification | Pass |
| Test cleanup | Admin confirmation, product/notification/image cleanup, deleted detail URL | Pass after fix |
| English | Home, account, product, search, share link, direct deep links | Pass |
| Arabic | Explicit deep link over an English cookie, SSR/client locale consistency, RTL, search, account | Pass after fix |
| Kurdish | Base-locale root, RTL, search, product navigation, translated mobile navigation | Pass after fix |
| Mobile | 390×844 home, search-to-product, bottom navigation, product CTA, seller/admin login layouts | Pass |
| Desktop | 1440×1000 home, product, account, filters, console inspection | Pass |
| Convex seller reads | Current seller identity and seller-owned product query under a real development seller identity | Pass |
| Convex admin reads | Products, sellers, admins, audit logs, and offers queries under a real development admin identity | Pass |
| Listing validation | Empty title, zero photos, and price above 1,000,000 IQD against deployed `products:add` | Pass: all rejected before writes |
| Static regression | TypeScript, translation-key consistency, production client/SSR build | Pass |

## Issues Fixed

### 1. Search was implemented but not visible

- **Symptom:** The home page maintained and applied a search state but rendered no search input.
- **Fix:** Restored the accessible `SearchInput` and connected it to persisted filters/reset behavior.
- **Verification:** `Nanit` returned exactly one matching product; an impossible query showed the localized empty state.

### 2. Malformed product IDs hung on a skeleton

- **Symptom:** `/products/not-an-id` failed Convex ID validation and the page never reached its not-found state.
- **Fix:** Changed the public query to accept a string, normalize it with `ctx.db.normalizeId`, and return `null` for malformed IDs. Added an exact return validator.
- **Verification:** Direct malformed English deep links now show “Product not found” with a back action.

### 3. Shared product URLs lost the active locale

- **Symptom:** An English product page generated a WhatsApp URL without `/en/`.
- **Fix:** Built the shared path with `localizeHref`.
- **Verification:** English WhatsApp targets contain `/en/products/<id>`; Kurdish base-locale targets remain unprefixed.

### 4. Account “About” controls were dead

- **Symptom:** Buyer and seller account About rows had empty click handlers.
- **Fix:** Added an expandable translated marketplace description in both views.
- **Verification:** The buyer About control expands on desktop without overflow or console errors.

### 5. Sellers could replace their verified login phone without OTP

- **Symptom:** Seller profile editing patched `users.phone`, even though that phone is the VerifySpeed login identity.
- **Fix:** Removed phone from the profile mutation and editable form; the verified phone remains visible as read-only profile data.
- **Verification:** Type-generated mutation callers compile without a phone argument, and the deployed mutation no longer accepts one.

### 6. Listing rules were only enforced in the UI

- **Symptom:** Direct Convex calls could bypass the form and submit an empty title, no photos, more than five photos, or an unsupported price.
- **Fix:** Added shared server validation for title, 1–5 photos, and integer prices from 5,000 through 1,000,000 IQD. Added the upper bound and translated range message to add/edit/repost forms.
- **Verification:** Live development-backend calls for an empty title, no photos, and 1,000,001 IQD all failed before any insert.

### 7. Explicit locale deep links conflicted with old cookies

- **Symptom:** Opening `/ar/...` with an English cookie could redirect or hydrate with Arabic document attributes and English content.
- **Fix:** The server now treats an explicit `/en/` or `/ar/` prefix as the locale for that request, persists it to the language cookie before client hydration, and preserves localized root trailing slashes.
- **Verification:** Arabic account deep links render Arabic SSR and client content with `lang="ar"`, `dir="rtl"`, Arabic links, no overflow, and no hydration warnings. Navigating directly from Arabic to an English product also produced no new console warnings/errors.

### 8. Mobile navigation stayed English in RTL locales

- **Symptom:** Home, Account, and Dashboard labels were hardcoded in the shared buyer shell.
- **Fix:** Reused the existing translated navigation messages.
- **Verification:** Kurdish mobile navigation renders `سەرەکی` and `ئەکاونت`.

### 9. Wrong-role admin verification left a seller session active

- **Symptom:** OTP verification created the session before the admin page rejected a non-admin role.
- **Fix:** The rejection path now logs out before displaying the authorization error.
- **Verification:** Code review, typecheck, and production build cover the path; a real wrong-role OTP remains credential-dependent.

### 10. OTP proxy errors exposed upstream messages

- **Symptom:** Send/verify API failures returned raw upstream exception messages.
- **Fix:** Errors are logged server-side while clients receive stable generic error codes only.
- **Verification:** Malformed requests return controlled `400` responses; TypeScript and production builds pass.

### 11. Product-detail hooks were conditional

- **Symptom:** Origin state/effect hooks appeared after loading/not-found early returns.
- **Fix:** Moved the hooks before conditional returns.
- **Verification:** Valid and invalid product transitions render without new hook or hydration errors.

### 12. Authenticated UI testing had no safe local identities

- **Symptom:** Seller/admin browser journeys stopped at the live VerifySpeed OTP boundary.
- **Fix:** Added deterministic mock seller and admin accounts, a development-only login control/API route, and an independently gated Convex action/internal mutation. The shortcut requires `ALLOW_MOCK_AUTH=true` on the development deployment.
- **Production safety:** Production builds return `404` from the HTTP shortcut and render no mock controls; Convex also rejects mock auth unless its deployment flag is explicitly enabled.
- **Verification:** Both roles received normal RS256 session JWTs, passed their route/Convex guards, survived navigation/re-login, and logged out cleanly.

### 13. Development R2 uploads were blocked by stale credentials

- **Symptom:** The seller form obtained a signed URL, but both browser and same-origin proxy uploads received `SignatureDoesNotMatch` from R2. The configured bucket belongs to a different Cloudflare account than the locally authenticated Wrangler account, so its credentials could not be repaired from this workspace.
- **Fix:** Mock-account development builds use authenticated Convex storage for QA images. Production retains the existing direct-to-R2 implementation.
- **Verification:** A PNG uploaded successfully on local port 3002, displayed on seller/admin/public pages, and was later removed.

### 14. Product deletion left related notifications behind

- **Symptom:** Removing a product deleted only its database row, leaving seller/admin notifications linked to a dead product.
- **Fix:** Centralized deletion now removes notifications indexed by product ID before deleting the product.
- **Verification:** The admin notification count dropped after deleting the synthetic listing, and the seller approval notification was removed.

### 15. Development product images were orphaned on deletion

- **Symptom:** A deleted mock listing would leave its Convex development-storage object behind.
- **Fix:** Product deletion recognizes same-deployment Convex storage URLs and removes those objects while leaving external/R2 lifecycle handling unchanged.
- **Verification:** The exact synthetic image URL returned `404` after admin deletion.

## Final Automated Results

```text
npm run typecheck
PASS

npm run check:i18n
PASS — 265 keys consistent across 3 locales

npm run build
PASS — client and SSR bundles built

npx convex dev --once
PASS — development functions ready

git diff --check
PASS

production preview mock-auth check
PASS — POST /api/auth/mock-login returned 404 and login HTML contained no mock controls
```

## Remaining External Boundaries

The deterministic accounts cover the app-owned session, role, seller, listing,
and ordinary-admin behavior. These third-party or higher-privilege states remain
outside the safe local run:

- Receipt and verification of a real VerifySpeed OTP
- Direct R2 upload with corrected credentials for account `c32fd7…`
- Super-admin-only mutations such as deleting another admin
- Launching WhatsApp and sending an actual message

No existing marketplace record was modified. The only synthetic product and its
image/notifications were removed; only the requested reusable mock seller/admin
accounts remain.
