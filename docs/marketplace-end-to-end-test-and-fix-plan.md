# Plan: Marketplace End-to-End Browser Test and Fix

**Generated**: 2026-07-23
**Estimated Complexity**: High

## Overview

Run the local Dasty2 marketplace as a real user in the Codex in-app browser, cover every reachable public, seller, and admin journey, repair reproducible defects, and repeat the full journey set after each material fix. The work is performed only against the configured local/development environment. Existing uncommitted work is treated as user-owned and must be preserved.

## Execution Status

Executed on 2026-07-23. Sprints 1–6 are complete for anonymous users, the
deterministic mock seller, and an ordinary mock admin. The full synthetic
listing lifecycle passed: create → pending → approve → public search/detail →
seller notification → admin delete/cleanup. Real VerifySpeed delivery, direct
R2 upload with externally corrected credentials, and super-admin-only mutations
remain the only external boundaries. See
`docs/marketplace-end-to-end-test-report.md` for evidence and fixes.

## Working Assumptions

- The configured Convex deployment and VerifySpeed credentials are development/test resources, not production.
- A disposable Iraqi-format phone number and received OTP may be used for seller-account testing.
- If a live OTP, privileged admin identity, or destructive production-like action cannot be safely obtained, the blocked journey is tested up to that boundary and recorded explicitly.
- Test listings use clearly synthetic titles prefixed with `Codex QA` so they can be identified and cleaned up safely.
- “Every part” means every route and meaningful UI state discoverable in this repository, on desktop and a representative mobile viewport, including English and smoke checks for Kurdish/Arabic localization.

## Prerequisites

- `.env.local` provides valid `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, R2, and WhatsApp configuration.
- Dependencies install successfully and the Convex development deployment is reachable.
- The application starts locally without modifying production configuration.
- The in-app browser is connected and can reach the local Vite URL.
- For full auth coverage: a disposable phone that can receive a VerifySpeed OTP.
- For full admin coverage: an existing development admin/super-admin account or a safe documented seed path.

## Sprint 1: Baseline and Test Inventory

**Goal**: Establish a reproducible baseline and a complete route/feature matrix.

**Demo/Validation**:

- `npm run typecheck`, `npm run check:i18n`, and `npm run build` produce recorded results.
- Local configuration is checked by variable name only; secret values are never printed.
- All file-based routes and their authorization boundaries are listed in the execution log.

### Task 1.1: Protect the Existing Worktree

- **Location**: repository root
- **Description**: Record the active branch, `git status`, and diff summary before editing. Treat all pre-existing changes as user-owned.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Baseline dirty files are known.
  - No destructive Git command is used.
- **Validation**: Compare final status and diff against the baseline.

### Task 1.2: Inventory Application Surfaces

- **Location**: `src/routes/`, `src/pages/`, `src/components/`, `convex/`
- **Description**: Map public, seller, admin, API, locale, notification, image, and data-management features to routes and actions.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Every discovered route has at least one planned check.
  - Each protected route identifies its required role.
- **Validation**: Cross-check the matrix against the generated route tree and file route names.

### Task 1.3: Run Static Baseline Checks

- **Location**: `package.json`, application source
- **Description**: Run type checking, translation-key consistency, and a production build before browser fixes.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Failures are captured with their first actionable error.
  - Pre-existing failures are separated from browser-discovered defects.
- **Validation**: Commands complete and results are recorded.

## Sprint 2: Start and Observe the Local System

**Goal**: Bring up the frontend and confirm its Convex/auth dependencies are reachable.

**Demo/Validation**:

- The home page returns a successful HTTP response.
- SSR content renders and the browser connects without a fatal console error.
- API/auth endpoints respond with an expected success or controlled validation error.

### Task 2.1: Start the Development App

- **Location**: `package.json`, `.env.local`
- **Description**: Start the Vite/TanStack development server on an available local port and retain its logs.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - A stable localhost URL is available.
  - The process remains running for the test session.
- **Validation**: HTTP request and initial browser load both succeed.

### Task 2.2: Verify Backend Connectivity

- **Location**: `src/lib/convex.ts`, `src/lib/session.ts`, `convex/`
- **Description**: Confirm public Convex queries work, session lookup degrades safely when signed out, and no missing environment value blocks SSR.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Public products/categories can be read.
  - Signed-out session is represented as signed out rather than a crash.
- **Validation**: Browser state, network responses, and server logs agree.

## Sprint 3: Public Marketplace Journeys

**Goal**: Verify that an anonymous buyer can discover, inspect, and act on listings.

**Demo/Validation**:

- The home/product flow works on desktop and mobile widths.
- Empty, loading, error, populated, and no-result states are understandable.
- English works fully; Kurdish and Arabic render RTL and preserve navigation.

### Task 3.1: Home and Navigation

- **Location**: `/`, `src/pages/home.jsx`, `src/components/buyer/PublicShell.jsx`
- **Description**: Verify initial render, header/navigation, account entry, sell entry, notification affordances, product cards, pagination/load-more, back navigation, and restored scroll/filter state.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - No broken links, layout overlap, hydration error, or dead controls.
  - Returning from a product preserves the expected home state.
- **Validation**: Browser interaction plus page/console inspection.

### Task 3.2: Search, Filter, and Sort

- **Location**: `/`, buyer filter components, `convex/products.ts`
- **Description**: Search by title/category/brand text; combine category, city, multi-brand, condition (if exposed), and price sort; clear filters; exercise a no-results query.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Results match active filters.
  - Clearing restores the unfiltered catalogue.
  - Search input remains responsive and has accessible labeling.
- **Validation**: Compare visible result count/cards before and after each action.

### Task 3.3: Product Detail

- **Location**: `/products/$id`, `src/pages/product-detail.jsx`
- **Description**: Open a listing, inspect gallery controls, seller/city/condition/price metadata, WhatsApp/contact action, related listings, share/copy affordances if exposed, and invalid/deleted IDs.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Detail data matches the selected card.
  - Media failure has a usable fallback.
  - Invalid IDs resolve to a controlled not-found/error state.
- **Validation**: Browser assertions and link target inspection without contacting a real seller.

### Task 3.4: Localization and Responsive Smoke

- **Location**: `/ckb/*`, `/ar/*`, locale switcher, global CSS
- **Description**: Switch among English, Kurdish, and Arabic; verify localized URL, language persistence, RTL direction, navigation, search, filters, and one product detail at desktop and mobile widths.
- **Dependencies**: Tasks 3.1–3.3
- **Acceptance Criteria**:
  - Locale switching does not lose the current journey unexpectedly.
  - RTL layouts have no clipped or reversed interactive controls.
- **Validation**: DOM direction/language inspection and screenshots at representative widths.

## Sprint 4: Seller Account and Listing Lifecycle

**Goal**: Verify a new seller can sign in, complete an account, create a listing, and manage it.

**Demo/Validation**:

- Signed-out users are redirected from protected seller routes.
- A disposable seller completes the OTP/profile flow.
- A synthetic listing is created and appears in the correct seller/public state.

### Task 4.1: Authentication Guard and OTP Validation

- **Location**: `/seller/login`, `/seller/*`, `src/components/auth/OtpLogin.jsx`, auth API routes
- **Description**: Test protected-route redirect, invalid phone, unsupported/empty input, send-code behavior, invalid/expired OTP, resend behavior, role routing, logout, and session persistence after reload.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Validation is clear and no secret/token is exposed.
  - A valid OTP creates a secure session and routes according to role.
  - Signed-out access cannot reach seller data mutations.
- **Validation**: Browser flow, cookie-agnostic session UI checks, and server/Convex logs.

### Task 4.2: New Seller Profile

- **Location**: `/seller/complete-profile`, `/seller/account`
- **Description**: Validate required fields, city/phone/name normalization, duplicate/account-role behavior, save, reload persistence, edit profile, and account deactivation/logout affordances if exposed.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Incomplete profiles cannot enter protected seller management.
  - Saved profile data is displayed consistently after reload.
- **Validation**: Create/edit/reload journey.

### Task 4.3: Create Listing

- **Location**: `/seller/add`, `src/pages/seller-add.jsx`, `src/lib/useImageUpload.js`
- **Description**: Exercise required-field errors, numeric boundaries, category/condition/city/brand selection, description limits, unsupported and oversized images, valid multi-image upload, reorder/remove if available, double-submit protection, and success navigation.
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Invalid data never creates a listing.
  - A valid `Codex QA` listing is created once with correct data and image URLs.
  - Upload errors are recoverable and leave the form usable.
- **Validation**: Browser form, seller dashboard, and public/admin status as appropriate.

### Task 4.4: Manage Listing Lifecycle

- **Location**: `/seller`, `/seller/products/$id/edit`, `/seller/repost/$id`
- **Description**: Verify dashboard states, edit all mutable fields, invalid ownership/ID protection, mark sold/delete/other exposed actions, repost an eligible listing, and status-dependent controls.
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - Edits persist and cannot cross seller ownership.
  - Destructive actions require clear intent and update all views.
  - Repost produces the documented result without duplicate accidental submissions.
- **Validation**: Complete lifecycle with the synthetic test listing.

## Sprint 5: Admin Journeys

**Goal**: Verify role-gated moderation and administration using a development admin account.

**Demo/Validation**:

- Non-admin users cannot access `/admin/*`.
- Admin dashboard counts and moderation actions update after a known test mutation.
- Super-admin-only controls stay hidden/forbidden for ordinary admins.

### Task 5.1: Admin Authentication and Guarding

- **Location**: `/admin/login`, `/admin/*`, `src/lib/route-guards.ts`
- **Description**: Test seller/non-admin rejection, valid admin OTP routing, inactive admin behavior, refresh persistence, and logout.
- **Dependencies**: Sprint 4 or an existing development admin
- **Acceptance Criteria**:
  - Role checks are enforced server-side/Convex-side, not only hidden in UI.
- **Validation**: Direct URL navigation as signed out, seller, admin, and if available super-admin.

### Task 5.2: Dashboard and Moderation

- **Location**: `/admin`, `/admin/products`, `/admin/sellers`, `/admin/offers`
- **Description**: Verify counts, filters, search, pagination, approve/reject/status changes, seller activation changes, featured offers, validation, confirmation, optimistic/error recovery, and cross-page consistency.
- **Dependencies**: Task 5.1 and the synthetic listing
- **Acceptance Criteria**:
  - Each action has the expected authorization and persisted state.
  - Failures do not leave misleading optimistic UI.
- **Validation**: Mutate one known test record, refresh, and confirm downstream seller/public state.

### Task 5.3: Admin Management and Audit Logs

- **Location**: `/admin/admins`, `/admin/logs`
- **Description**: Verify ordinary-admin versus super-admin permissions, adding/removing/toggling admins where safely supported, audit log creation, search/filter/pagination, and self-protection rules.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - Privileged mutations are inaccessible to insufficient roles.
  - Relevant actions create accurate audit entries.
- **Validation**: Role-based direct mutation attempts plus UI checks.

## Sprint 6: Fix Loop and Regression

**Goal**: Repair every safely reproducible issue and prove the fixes.

**Demo/Validation**:

- Each issue has reproduction, root cause, minimal fix, and regression check.
- Static checks and all previously passing browser journeys remain green.

### Task 6.1: Triage Defects

- **Location**: affected source files
- **Description**: Classify issues by severity: blocker/security/data loss, major broken journey, minor usability/accessibility, or cosmetic. Fix in severity order.
- **Dependencies**: Sprints 3–5
- **Acceptance Criteria**:
  - Browser symptoms are tied to a specific root cause before editing.
  - Fixes do not overwrite unrelated user changes.
- **Validation**: Focused reproduction before and after each patch.

### Task 6.2: Add Focused Automated Coverage

- **Location**: existing test locations or new minimal tests near affected logic
- **Description**: Add tests for deterministic logic and high-risk Convex authorization/validation defects where the repository’s current test setup supports it.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Tests fail on the old behavior and pass with the fix when practical.
- **Validation**: Targeted test command and typecheck.

### Task 6.3: Full Regression Pass

- **Location**: entire app
- **Description**: Repeat public, seller, admin, locale, responsive, direct-route, refresh, and console/network checks. Run the production build last.
- **Dependencies**: Tasks 6.1–6.2
- **Acceptance Criteria**:
  - No known blocker or major regression remains in an accessible journey.
  - Any access-dependent gap is explicitly documented.
- **Validation**: Final route/feature matrix plus static command results.

## Testing Strategy

- Use semantic browser interactions (roles, labels, visible text) for real-user behavior.
- Check server output and browser console after each route cluster.
- Test signed-out, seller, admin, and super-admin roles where credentials exist.
- Use one synthetic `Codex QA` listing for lifecycle tests and avoid mutating unrelated records.
- Exercise both happy paths and validation/error paths.
- Run desktop first, then responsive/RTL smoke checks.
- Re-run the smallest reproduction immediately after a fix, followed by the affected journey cluster.
- Finish with `npm run typecheck`, `npm run check:i18n`, and `npm run build`.

## Issue Log Format

For each discovered defect record:

- Route and role
- Severity
- Reproduction steps
- Expected versus actual result
- Console/network/server evidence
- Root cause and files changed
- Focused verification
- Regression impact

## Potential Risks and Gotchas

- Live OTP delivery can block full account creation without a disposable reachable phone.
- Existing uncommitted authentication migration work is extensive; fixes must be minimal and avoid reverting that work.
- The configured Convex deployment may contain shared data. Test records must be clearly labeled and destructive actions limited to those records.
- R2 upload tests depend on development bucket CORS and credentials.
- Admin and super-admin flows require role-specific development accounts; lack of access limits UI completion but not signed-out/negative authorization checks.
- Locale middleware can redirect based on cookie or `Accept-Language`; tests must distinguish intended locale redirects from loops.
- Browser “contact seller” actions may launch WhatsApp. Verify the generated target without sending a message.
- “Every part” cannot include third-party delivery internals or unavailable privileged states; those boundaries are reported, not silently skipped.

## Rollback Plan

- Keep fixes small and scoped; do not reset, stash, or discard the user’s pre-existing worktree.
- Use the recorded initial diff/status to identify only files changed during this effort.
- Remove only synthetic `Codex QA` development records when their exact IDs are known and deletion is supported safely.
- If a fix regresses another flow, revert only that fix’s own patch while preserving all pre-existing edits.
