import type { AuthConfig } from "convex/server";

// Auth provider Convex accepts identity tokens from: the app's own phone-OTP
// session JWTs (VerifySpeed). `domain` is this deployment's site URL, whose
// /.well-known/* endpoints (convex/http.ts) serve the OIDC discovery + JWK set
// used to verify the RS256 signature. `applicationID` matches the JWT `aud`.
export default {
  providers: [
    // CONVEX_SITE_URL is always provided by the Convex runtime.
    { domain: process.env.CONVEX_SITE_URL!, applicationID: "convex" },
  ],
} satisfies AuthConfig;
