# Auth Migration Plan — Clerk ➜ VerifySpeed Phone-OTP

Status: **IMPLEMENTED in code** (2026-07-18). Remaining = operator steps: keygen +
Convex env, run `internal.migrate.migrateToVerifySpeed`, deploy narrowed schema.
See "Operator runbook" at the bottom of this file.
Target: fully remove Clerk, delete all Clerk-provisioned seller users, and replace auth
with phone-number OTP verified through **VerifySpeed** (backend REST integration).

---

## 0. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | **Session layer** | **Custom RS256 JWT** minted server-side after VerifySpeed confirms the phone. Convex validates it via a JWKS endpoint we self-host on the existing `*.convex.site` domain. No `@convex-dev/auth` library. |
| 2 | **Existing data** | **Wipe all `role:"seller"` users + their products/notifications**. **Keep** `admin`/`super_admin` users, re-keyed to phone. Admin-authored products (`sellerId:"ADMIN"`) are kept. |
| 3 | **OTP delivery** | Offer WhatsApp / Telegram / SMS. Default = **WhatsApp OTP**; if the user has no WhatsApp, fall back to **Telegram**, then **SMS**. |
| 4 | **OTP validation path** | **Backend REST** (`POST /verifications/validate-otp`) — server-key never leaves the server. No client Web SDK. |

### Why VerifySpeed does NOT replace Clerk 1:1
VerifySpeed only **proves phone ownership** and returns a short-lived proof `token`. It is **not**
a session/identity provider — it has no JWKS, no long-lived session, no `ctx.auth` integration.
So we must own the session layer ourselves: mint our own JWT that Convex trusts, exactly the way
`@convex-dev/auth` does internally (self-hosted OIDC on `*.convex.site`).

---

## 1. Target architecture

### 1.1 End-to-end login flow
```
Browser (login page)
  │  1. POST /api/auth/send-otp   { methodName, phone, language }
  ▼
Worker route (injects real client IPv4 from CF-Connecting-IP)
  │  → convex action  auth.sendOtp({ methodName, phone, language, clientIpv4 })
  │       → VS GET  /verifications/initialize     (server-key + client IP)
  │       → VS POST /verifications/create          → { verificationKey }
  ◄  returns { verificationKey }   (deepLink is null for OTP methods)

Browser (OTP input)
  │  2. POST /api/auth/verify-otp  { code, verificationKey }
  ▼
Worker route
  │  → convex action  auth.verifyOtp({ code, verificationKey })
  │       → VS POST /verifications/validate-otp     (server-key)
  │             ├─ succeed:false → return {ok:false, errorCode}
  │             └─ succeed:true  → phoneNumber, VS token
  │       → internal mutation upsertUserByPhone(phone) → userId (+role)
  │       → mint RS256 JWT { iss: CONVEX_SITE_URL, aud:"convex", sub:userId, phone, role }
  │       → return { ok:true, jwt, userId, role }
  │  Worker sets httpOnly cookie  dasty2-session = jwt  (30d)
  ◄  returns { ok:true, role }

Browser reload / SSR
  │  fetchSession() server-fn reads dasty2-session cookie → returns jwt
  ▼
ConvexProviderWithAuth(useVerifySpeedAuth) → convex.setAuth(jwt)
Convex validates jwt:
  fetch CONVEX_SITE_URL/.well-known/openid-configuration → jwks_uri
  fetch /.well-known/jwks.json → RS256 public key → verify
  ctx.auth.getUserIdentity() → { subject: userId, issuer, phone, role }
```

### 1.2 Where secrets live
- `VERIFYSPEED_SERVER_KEY` → **Convex env only** (all VS calls happen inside Convex actions).
- `JWT_PRIVATE_KEY` (PKCS8 PEM, RS256) → **Convex env only** (minting happens in Convex).
- JWKS **public** key → served publicly by `convex/http.ts` (inline in code or `JWKS` env var).
- Worker holds **no** auth secret anymore (drop `CLERK_SECRET_KEY`).

> Security note: the whole VerifySpeed `validate-otp` runs **inside** `auth.verifyOtp`, so even
> if the Convex action were called directly, an attacker still needs a valid live OTP code. The
> mint mutation is never exposed as a public "give me a session for phone X" endpoint.

### 1.3 Identity model after migration
- JWT `sub` = the Convex `users._id` string. `iss` = `CONVEX_SITE_URL`. `aud` = `"convex"`.
- `convex/auth.ts#getCurrentUser` becomes a single `ctx.db.get(identity.subject)` — no more
  `by_clerkUserId` / `by_clerkTokenIdentifier` lookups.
- `products.sellerId` **already** stores `users._id` → **no product rewrite needed** for kept data.

---

## 2. VerifySpeed account prerequisites (manual, before coding)

- [ ] Create/verify VerifySpeed project; copy the **server-key** from the dashboard.
- [ ] Enable methods: `whatsapp-otp`, `telegram-otp`, `sms-otp`.
- [ ] Confirm sender/branding + supported languages (`en`, `ar`, `ckb` — matches our locales).
- [ ] Decide token trust: use response `phoneNumber` from `validate-otp` directly (recommended,
      simplest) OR add a `GET /verifications/result` re-check for `firstTimeVerified` anti-reuse.
      Plan uses the direct `phoneNumber` from `validate-otp`.

---

## 3. Backend (Convex) work

### 3.1 New crypto/JWKS plumbing
- **Add dep**: `jose` (pure-JS JWT sign/verify + JWK export; works in Convex runtime).
- **One-off keygen script** (`scripts/gen-jwt-keys.mjs`): generate RS256 keypair, print
  - `JWT_PRIVATE_KEY` (PKCS8 PEM) → set in Convex env
  - `JWKS` (public JWK set JSON, with a stable `kid`) → set in Convex env (or inline in http.ts)
- **`convex/http.ts`** (new): `httpRouter` serving
  - `GET /.well-known/openid-configuration` → `{ issuer: <CONVEX_SITE_URL>, jwks_uri: <..>/.well-known/jwks.json }`
  - `GET /.well-known/jwks.json` → the public JWK set
  - (`CONVEX_SITE_URL` is available as `process.env.CONVEX_SITE_URL` inside Convex.)

### 3.2 `convex/auth.config.ts` (rewrite)
```ts
export default {
  providers: [
    { domain: process.env.CONVEX_SITE_URL, applicationID: "convex" },
  ],
} satisfies AuthConfig;
```
Remove all Clerk env reads.

### 3.3 `convex/verifyspeed.ts` (new) — VS REST client
- `initialize(clientIpv4)` → `GET /verifications/initialize`
- `create({ methodName, language, phoneNumber }, clientIpv4)` → `POST /verifications/create`
- `validateOtp({ code, verificationKey })` → `POST /verifications/validate-otp`
- Base URL `https://api.verifyspeed.com/v1/`; `server-key` header from `process.env.VERIFYSPEED_SERVER_KEY`.
- Map error codes: `OTP_EXPIRED`, `OTP_INVALID`, `OTP_ALREADY_VERIFIED`.

### 3.4 `convex/authActions.ts` (new) — public actions
- `sendOtp({ methodName, phoneNumber(E.164), language, clientIpv4 })`
  → VS initialize + create → `{ verificationKey }`.
- `verifyOtp({ code, verificationKey })`
  → VS validate-otp; on `succeed:true`:
    - `runMutation(internal.users.upsertUserByPhone, { phone })` → `{ userId, role }`
    - mint RS256 JWT (`jose.SignJWT`, `importPKCS8`, 30d exp, `kid` matching JWKS)
    - return `{ ok:true, jwt, userId, role }`
  → on failure return `{ ok:false, errorCode }`.

### 3.5 `convex/users.ts` (rewrite identity bits)
- **New** `internal.users.upsertUserByPhone({ phone })`:
  - find `by_phone`; if found → return `{ userId, role }` (do **not** downgrade admins).
  - else → insert `{ role:"seller", phone, name:"", registeredAt:now, isActive:true }` → return.
  - New sellers still route through **complete-profile** to fill `name/city/address`.
- Remove Clerk fields from `ensureCurrent` / `createSeller`; `createSeller` becomes
  `completeSellerProfile({ name, city, address })` patching the JWT-resolved current user.
- `getCurrentSeller`, `getCurrent`, `getAll`, `getAdmins`, role mutations: unchanged logic,
  now resolving identity via the new `getCurrentUser`.

### 3.6 `convex/auth.ts` (rewrite resolver)
```ts
export async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { identity: null, user: null };
  const user = await ctx.db.get(identity.subject as Id<"users">);
  return { identity, user };
}
```
- `identityEmail` → keep for admin logs (read `identity.email` if present; else user.email).
- `requireAdmin/requireSuperAdmin/getCurrentSeller/requireCurrentSeller` unchanged (delegate).

### 3.7 `convex/schema.ts` (migration-aware)
- `users`: **remove** `clerkTokenIdentifier`, `clerkUserId` and indexes
  `by_clerkTokenIdentifier`, `by_clerkUserId`. Make `phone` **required** (`v.string()`) and add
  `.index("by_phone", ["phone"])`. Keep `email` optional.
- **Remove** `otpCodes` table (email OTP, unused). Delete `convex/otp.ts`.
- Do the schema field removal **after** the data migration (widen → migrate → narrow), or run
  with `schemaValidation` staged so Convex doesn't reject old rows.

### 3.8 Data migration — `convex/migrate.ts` (add `migrateToVerifySpeed` internal mutation)
Run once (dashboard / `convex run`):
1. **Pre-check**: every `admin`/`super_admin` user MUST have a non-empty `phone` (E.164). If any
   missing → throw with the list; operator sets phones first (dashboard) and re-runs.
2. Delete all `role:"seller"` users.
3. Delete all `products` where `sellerId !== "ADMIN"` (+ their `notifications`). Keep `"ADMIN"` products.
4. Delete all `notifications` where `sellerId !== "ADMIN"`.
5. For kept admins: unset `clerkUserId` / `clerkTokenIdentifier`.
6. Delete all `otpCodes` rows.
> Order: run this migration while the schema still allows the Clerk fields (they’re optional),
> then land the schema change in §3.7 that drops them.

### 3.9 Convex env changes
- **Add**: `VERIFYSPEED_SERVER_KEY`, `JWT_PRIVATE_KEY`, `JWKS`.
- **Remove**: `CLERK_FRONTEND_API_URL`, `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`.
- `CONVEX_SITE_URL` is provided by Convex automatically.

---

## 4. Frontend / server (TanStack Start on Cloudflare) work

### 4.1 Provider swap — `src/routes/__root.tsx`
- Remove `ClerkProvider`, `ConvexProviderWithClerk`, `@clerk/*` imports, `fetchClerkAuth`.
- Add `ConvexProviderWithAuth client={convexClient} useAuth={useVerifySpeedAuth}`.
- `beforeLoad`: replace `fetchClerkAuth()` with `fetchSession()` (reads `dasty2-session` cookie),
  keep `serverHttpClient?.setAuth(jwt)` for SSR-prefetched authed queries.

### 4.2 New auth client glue — `src/lib/session.ts` (+ `useVerifySpeedAuth` hook)
- `fetchSession` server-fn: `getCookie('dasty2-session')` → return `{ jwt }` (or null).
- `useVerifySpeedAuth()`: returns `{ isLoading, isAuthenticated, fetchAccessToken }` where
  `fetchAccessToken` calls `fetchSession()` — the exact contract `ConvexProviderWithAuth` needs.
- `useConvexAuth()` (already used in shells) keeps working unchanged — it reflects whatever auth
  provider is mounted, so the shells need no auth-source rewrite, only Clerk-hook removal.

### 4.3 New API routes (`src/routes/api/`)
- `auth.send-otp.ts` (POST): read client IPv4 (`CF-Connecting-IP` / `X-Forwarded-For`), call
  `api.authActions.sendOtp`, return `{ verificationKey }`.
- `auth.verify-otp.ts` (POST): call `api.authActions.verifyOtp`; on `ok` set httpOnly cookie
  `dasty2-session=jwt` (`secureCookieOptions`, 30d) and return `{ ok, role }`; else `{ ok:false, errorCode }`.
- `auth.logout.ts` (POST): `deleteCookie('dasty2-session')` → `{ ok:true }`.
- **Delete** `seller.send-otp.ts`, `seller.verify-otp.ts`, `seller.register.ts`,
  `admin.send-otp.ts`, `admin.verify-otp.ts` (the 410 stubs), and the `dasty2-seller` /
  `dasty2-admin` cookie machinery.
- Rewrite `seller.me.ts` / `admin.me.ts` to resolve via `getCurrentSeller` / current user off the
  new session (or delete `seller.me.ts` and let `SellerSessionContext` use `convexQuery` directly).

### 4.4 Login UI — rewrite `src/pages/seller-login.jsx`
- Two-step: **phone entry** → **OTP entry**. Country default +964; store E.164.
- Method cascade: start `whatsapp-otp`; a "Didn't get it? Try Telegram / SMS" control re-calls
  send-otp with `telegram-otp` then `sms-otp`.
- Errors surfaced from `errorCode` (expired/invalid/already-verified) via i18n.
- On verify success: if `role` admin → go `/admin`; else if profile incomplete (no name) →
  `/seller/complete-profile`; else `/seller`.
- **Admin login** (`src/pages/admin-login.jsx`): reuse the same OTP component; on success the
  `_admin` guard enforces `role`. Non-admin phone → show "not authorized".

### 4.5 Onboarding — `src/pages/seller-complete-profile.jsx`
- Keep. Remove Clerk `useUser`. Submit → new `completeSellerProfile` mutation (name/city/address;
  phone already known from the session). Then navigate `/seller`.

### 4.6 Shells / account / sign-out
- `src/components/seller/SellerShell.jsx`, `src/components/admin/AdminShell.jsx`,
  `src/components/buyer/PublicShell.jsx`: remove `useAuth`/`useClerk`/`useUser`; keep
  `useConvexAuth()`. Sign-out = `POST /api/auth/logout` → `convex.clearAuth?.()` → navigate.
- `src/pages/seller-account.jsx`, `src/pages/account.jsx`: drop Clerk user display; seller info
  comes from `api.users.getCurrent`/`getCurrentSeller`. Buyers are anonymous — simplify `account.jsx`.
- **Delete** `src/lib/clerkAuthReset.js`.

### 4.7 Route guards
- `src/lib/route-guards.ts` (`requireSeller` via `convexQuery(getCurrentSeller)`): **no change**.
- `src/lib/auth-guards.ts`: drop Clerk; `requireAdminFn` resolves current user + role off session.
- `src/routes/_seller.tsx`, `_admin.tsx`: unchanged wiring (guards updated underneath).

### 4.8 Delete Clerk-only files/routes
- `src/routes/_public/sign-in.$.tsx`, `sign-up.$.tsx` (virtual Clerk routes).
- `src/lib/clerk-seller.ts`, `src/lib/clerk-admin.ts`, `src/lib/admin-auth.ts` (Clerk parts).
- `src/start.ts`: remove `clerkMiddleware()`, keep `csrfMiddleware`.

### 4.9 i18n
- Phone/OTP keys already exist in `messages/{en,ckb,ar}.json` (`loginPhoneLabel`, `otpSent`,
  `otpLabel`, `verifyBtn`, `backToPhone`, …). Add: method-picker labels
  (`otpMethodWhatsapp/Telegram/Sms`, `otpTryAnother`), and error strings
  (`otpErrExpired/Invalid/AlreadyVerified`, `otpNotAuthorized`). Update `backToPhone` copy
  (currently "Back to email"). Run `npm run check:i18n`.

---

## 5. Config / infra changes

- **`wrangler.jsonc`**: remove `CLERK_SECRET_KEY` from `secrets.required` (both default + production
  env). No new Worker secret. Keep `RESEND_API_KEY`, `nodejs_compat`, `VITE_CONVEX_*` vars.
- **`.env.example` / `.env.local`**: delete all `VITE_CLERK_*` and `CLERK_*`. Add commented
  pointers noting `VERIFYSPEED_SERVER_KEY`, `JWT_PRIVATE_KEY`, `JWKS` live in **Convex** env.
- **`.github/workflows/deploy.yml`**: remove `VITE_CLERK_PUBLISHABLE_KEY` build var and the two
  `wrangler secret put CLERK_SECRET_KEY` steps (dev + prod). Set the three new values in Convex
  env per deployment (dashboard or `npx convex env set`), not via wrangler.
- **`package.json`**: remove `@clerk/tanstack-react-start`; add `jose`. `twilio` is unused by this
  plan — remove unless kept for other reasons.
- Delete `.clerk/` dir; drop its `.gitignore` entry.
- `README.md` / `CLAUDE.md`: replace the Clerk auth section with the VerifySpeed flow; update the
  prerendering caveat (now depends on VerifySpeed/JWT env, not Clerk).

---

## 6. Suggested implementation order (PR-sized phases)

1. **Crypto + JWKS foundation**: `jose`, keygen script, `convex/http.ts`, `auth.config.ts`,
   Convex env (`JWT_PRIVATE_KEY`, `JWKS`, `VERIFYSPEED_SERVER_KEY`). Verify Convex accepts a
   hand-minted JWT (temporary test action) end-to-end before touching UI.
2. **VS client + actions**: `convex/verifyspeed.ts`, `convex/authActions.ts`,
   `internal.users.upsertUserByPhone`, `completeSellerProfile`. Unit-test send/verify against a
   real number.
3. **Session glue**: `src/lib/session.ts` + `useVerifySpeedAuth`; swap provider in `__root.tsx`;
   API routes `auth.send-otp`/`verify-otp`/`logout`. App authenticates but old UI still Clerk-shaped.
4. **Login/onboarding UI**: rewrite `seller-login.jsx` (method cascade), `admin-login.jsx`,
   `complete-profile.jsx`; i18n keys. Guards + shells de-Clerked.
5. **Data migration**: run `migrateToVerifySpeed` (after admins have phones); then land schema
   drop (§3.7).
6. **Teardown**: delete all Clerk files/routes/deps/env; update wrangler, deploy.yml, docs; run
   `npm run typecheck`, `check:i18n`, build, deploy dev.

---

## 7. Testing checklist

- [ ] New seller: phone → WhatsApp OTP → complete-profile → `/seller`; product create works,
      `sellerId === users._id`.
- [ ] Method fallback: no-WhatsApp number falls to Telegram then SMS.
- [ ] Returning seller: same phone re-logs into the same account (no dupe row).
- [ ] Admin: admin phone logs in, `_admin` guard passes; a random phone is rejected as non-admin.
- [ ] Wrong/expired/reused code → correct localized error (`OTP_INVALID/EXPIRED/ALREADY_VERIFIED`).
- [ ] SSR: hard refresh on `/seller` keeps session (cookie → `fetchSession` → `setAuth`); no skeleton.
- [ ] Sign-out clears cookie + Convex auth; protected routes redirect to login.
- [ ] Convex rejects a tampered/expired JWT (401) — `getUserIdentity()` returns null.
- [ ] Migration: seller users + non-ADMIN products gone; ADMIN products + admins intact.
- [ ] `npm run typecheck`, `npm run check:i18n`, `npm run build` all green.

---

## 8. Risks & mitigations

- **Convex OIDC exactness**: `iss` in the JWT, `issuer` in openid-configuration, and `domain` in
  auth.config must be byte-identical (`CONVEX_SITE_URL`, no trailing slash). Mismatch → silent
  "no identity". Test in Phase 1.
- **JWKS caching / key rotation**: Convex caches JWKS; on key rotation keep the old `kid` in the
  set until old tokens expire. Include a stable `kid`.
- **30-day non-revocable JWT**: acceptable for this app (matches prior 30-day cookie). If
  revocation is later required, shorten exp + add a `sessions` table check — out of scope now.
- **Admin lockout**: the migration hard-fails unless every admin has a phone. Set admin phones in
  the Convex dashboard **before** running it. Optionally seed a known bootstrap super_admin phone.
- **Client IP for VS**: must pass the real client IPv4 (`CF-Connecting-IP`) from the Worker, not a
  proxy/localhost, or fraud checks/method availability degrade.
- **Data loss is irreversible**: back up (Convex export/snapshot) the `users`/`products`/
  `notifications` tables before running the migration.

---

## 9. File-change index (quick reference)

**Add**: `convex/http.ts`, `convex/verifyspeed.ts`, `convex/authActions.ts`,
`src/lib/session.ts`, `src/routes/api/auth.send-otp.ts`, `src/routes/api/auth.verify-otp.ts`,
`src/routes/api/auth.logout.ts`, `scripts/gen-jwt-keys.mjs`.

**Rewrite**: `convex/auth.config.ts`, `convex/auth.ts`, `convex/users.ts`, `convex/schema.ts`,
`convex/migrate.ts`, `src/routes/__root.tsx`, `src/start.ts`, `src/lib/auth-guards.ts`,
`src/pages/seller-login.jsx`, `src/pages/admin-login.jsx`, `src/pages/seller-complete-profile.jsx`,
`src/pages/seller-account.jsx`, `src/pages/account.jsx`,
`src/components/{seller/SellerShell,admin/AdminShell,buyer/PublicShell}.jsx`,
`src/lib/SellerSessionContext.jsx`, `src/lib/useSellerSession.js`,
`src/routes/api/seller.me.ts`, `src/routes/api/admin.me.ts`,
`wrangler.jsonc`, `.env.example`, `.github/workflows/deploy.yml`, `package.json`,
`messages/{en,ckb,ar}.json`, `README.md`, `CLAUDE.md`.

**Delete**: `convex/otp.ts`, `src/lib/clerk-seller.ts`, `src/lib/clerk-admin.ts`,
`src/lib/admin-auth.ts`, `src/lib/clerkAuthReset.js`, `src/routes/_public/sign-in.$.tsx`,
`src/routes/_public/sign-up.$.tsx`, `src/routes/api/seller.send-otp.ts`,
`src/routes/api/seller.verify-otp.ts`, `src/routes/api/seller.register.ts`,
`src/routes/api/admin.send-otp.ts`, `src/routes/api/admin.verify-otp.ts`,
`src/routes/api/seller.logout.ts`, `src/routes/api/admin.logout.ts`, `.clerk/`.

---

## Operator runbook (post-code, run once per deployment)

The code migration is complete and typechecks/builds green. These steps are the
manual, environment-side actions I cannot run for you (they touch secrets and
destroy data). **Do them in order.**

### 1. Generate the session-JWT keypair
```
node scripts/gen-jwt-keys.mjs
```
Copy the two printed values (`JWT_PRIVATE_KEY` = base64 PKCS8 PEM, `JWKS` = public JWK set).

### 2. Set Convex env (per deployment — dev, then prod)
```
npx convex env set VERIFYSPEED_SERVER_KEY <server-key-from-verifyspeed-dashboard>
npx convex env set JWT_PRIVATE_KEY <base64-pkcs8-from-step-1>
npx convex env set JWKS '<public-jwk-set-json-from-step-1>'
```
`CONVEX_SITE_URL` is provided automatically by Convex (it is the JWT issuer).

### 3. Give every admin a phone (prevents lockout)
In the Convex dashboard, set an E.164 `phone` (e.g. `+9647XXXXXXXXX`) on every
`admin`/`super_admin` user. The migration aborts with a list if any is missing.

### 4. Back up (irreversible deletion ahead)
Export/snapshot `users`, `products`, `notifications` from the Convex dashboard.

### 5. Run the data migration, then re-enable schema validation
The committed `convex/schema.ts` is the **final** (narrowed) shape but ships with
`{ schemaValidation: false }` so it deploys cleanly over legacy Clerk-era rows.
Once the code is deployed (steps ahead), from a machine with the deployment
selected:
```
npx convex run migrate:migrateToVerifySpeed      # after step 3 gave admins phones
```
Then **delete the `{ schemaValidation: false }` options object** at the bottom of
`convex/schema.ts` and deploy again — validation now passes because the data is
clean, and the schema is fully enforced going forward.

(Dev with disposable data: instead clear the `users`/`products`/`notifications`
tables in the dashboard, create a fresh admin with `role` + E.164 `phone`, then
remove the flag and deploy.)

### 6. Deploy the app
```
npm run deploy:dev     # then npm run deploy:prod
```

### 7. Clean up old secrets (optional but recommended)
- Convex env: `npx convex env remove CLERK_FRONTEND_API_URL` (and any
  `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`).
- GitHub Actions secrets: delete `DEV_/PROD_CLERK_SECRET_KEY` and
  `DEV_/PROD_VITE_CLERK_PUBLISHABLE_KEY`.
