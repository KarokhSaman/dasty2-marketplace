import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

// Self-hosted OIDC discovery for the app's own session JWTs (phone-OTP auth via
// VerifySpeed). Convex validates a session token by fetching
// `${CONVEX_SITE_URL}/.well-known/openid-configuration` → `jwks_uri` → the JWK
// set below, then verifying the RS256 signature. The provider is registered in
// convex/auth.config.ts with `domain === CONVEX_SITE_URL`.
//
// `JWKS` is the public JWK set (see scripts/gen-jwt-keys.mjs); the matching
// private key lives in the `JWT_PRIVATE_KEY` Convex env secret and is only used
// by the auth actions that mint tokens.

const http = httpRouter();

const cacheHeaders = {
  "content-type": "application/json",
  "cache-control": "public, max-age=3600",
} as const;

http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async () => {
    const issuer = process.env.CONVEX_SITE_URL;
    if (!issuer) {
      return new Response("CONVEX_SITE_URL not set", { status: 500 });
    }
    return new Response(
      JSON.stringify({
        issuer,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        response_types_supported: ["id_token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
      }),
      { headers: cacheHeaders },
    );
  }),
});

http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    const jwks = process.env.JWKS ?? '{"keys":[]}';
    return new Response(jwks, { headers: cacheHeaders });
  }),
});

export default http;
