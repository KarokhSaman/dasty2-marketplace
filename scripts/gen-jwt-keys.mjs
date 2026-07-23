// Generate an RS256 keypair for the app's session JWTs.
//
// Usage:  node scripts/gen-jwt-keys.mjs [outDir]
//
// Prints (and optionally writes to <outDir>) two values:
//   JWT_PRIVATE_KEY  — base64(PKCS8 PEM), set in Convex env (secret; never commit)
//   JWKS             — public JWK Set JSON, set in Convex env and served by convex/http.ts
//
// The `kid` is the RFC 7638 thumbprint so it is stable/derivable from the public key.
// Convex validates our session JWTs against this JWKS via the self-hosted OIDC
// discovery documents in convex/http.ts.

import { generateKeyPair, exportPKCS8, exportJWK, calculateJwkThumbprint } from "jose";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ALG = "RS256";
const outDir = process.argv[2] ?? null;

const { publicKey, privateKey } = await generateKeyPair(ALG, { extractable: true });

const privatePem = await exportPKCS8(privateKey);
const privateKeyBase64 = Buffer.from(privatePem, "utf8").toString("base64");

const publicJwk = await exportJWK(publicKey);
const kid = await calculateJwkThumbprint(publicJwk);
const jwkForSet = { ...publicJwk, kid, use: "sig", alg: ALG };
const jwks = { keys: [jwkForSet] };
const jwksJson = JSON.stringify(jwks);

console.log("=== kid ===");
console.log(kid);
console.log("\n=== JWT_PRIVATE_KEY (base64 PKCS8 PEM) — Convex env secret ===");
console.log(privateKeyBase64);
console.log("=== JWKS (public) — Convex env ===");
console.log(jwksJson);

if (outDir) {
  writeFileSync(join(outDir, "jwt_private_key.b64"), privateKeyBase64 + "\n");
  writeFileSync(join(outDir, "jwks.json"), jwksJson + "\n");
  writeFileSync(join(outDir, "kid.txt"), kid + "\n");
  console.log(`\nWrote jwt_private_key.b64, jwks.json, kid.txt to ${outDir}`);
}
