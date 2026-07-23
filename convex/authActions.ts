"use node";

import { v } from "convex/values";
import { SignJWT, importPKCS8 } from "jose";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { vsCreate, vsValidateOtp, type VsMethod, type VsLanguage } from "./verifyspeed";

const methodValidator = v.union(
  v.literal("whatsapp-otp"),
  v.literal("telegram-otp"),
  v.literal("sms-otp"),
);
const languageValidator = v.union(v.literal("en"), v.literal("ar"), v.literal("ckb"));
const mockRoleValidator = v.union(v.literal("seller"), v.literal("admin"));

// Mint an RS256 session JWT that Convex will accept (auth.config.ts custom
// provider + convex/http.ts JWKS). `sub` = users._id so getCurrentUser resolves
// via ctx.db.get(subject). JWT_PRIVATE_KEY is stored base64-encoded (PKCS8 PEM).
async function mintSessionJwt(claims: {
  userId: string;
  phone: string;
  role: string;
}): Promise<string> {
  const b64 = process.env.JWT_PRIVATE_KEY;
  if (!b64) throw new Error("JWT_PRIVATE_KEY is not set");
  const issuer = process.env.CONVEX_SITE_URL;
  if (!issuer) throw new Error("CONVEX_SITE_URL is not set");
  const jwks = process.env.JWKS;
  if (!jwks) throw new Error("JWKS is not set");

  const pem = Buffer.from(b64, "base64").toString("utf8");
  const key = await importPKCS8(pem, "RS256");
  const kid = (JSON.parse(jwks).keys?.[0]?.kid ?? undefined) as string | undefined;

  return await new SignJWT({ phone: claims.phone, role: claims.role })
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(issuer)
    .setAudience("convex")
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

// Step 1 — send an OTP. VerifySpeed delivers the code over the chosen channel.
// clientIpv4 is injected by the Worker route from the real client IP.
export const sendOtp = action({
  args: {
    methodName: methodValidator,
    phoneNumber: v.string(),
    language: v.optional(languageValidator),
    clientIpv4: v.string(),
  },
  returns: v.object({ verificationKey: v.string(), methodName: v.string() }),
  handler: async (
    _ctx,
    args,
  ): Promise<{ verificationKey: string; methodName: string }> => {
    const created = await vsCreate(
      {
        methodName: args.methodName as VsMethod,
        language: (args.language ?? "en") as VsLanguage,
        phoneNumber: args.phoneNumber,
      },
      args.clientIpv4,
    );
    return { verificationKey: created.verificationKey, methodName: created.methodName };
  },
});

// Step 2 — validate the OTP. On success VerifySpeed returns the verified phone;
// we upsert the user and mint a session JWT. Validating inside Convex means a
// direct call still needs a live code — the mint path is never a bare
// "session for phone X" endpoint.
export const verifyOtp = action({
  args: { code: v.string(), verificationKey: v.string() },
  returns: v.object({
    ok: v.boolean(),
    userId: v.optional(v.string()),
    role: v.optional(v.string()),
    jwt: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    { code, verificationKey },
  ): Promise<{
    ok: boolean;
    userId?: string;
    role?: string;
    jwt?: string;
    errorCode?: string;
    errorMessage?: string;
  }> => {
    const result = await vsValidateOtp({ code, verificationKey });

    if (!result.succeed) {
      return {
        ok: false,
        errorCode: result.errorCode ?? "OTP_INVALID",
        errorMessage: result.errorMessage ?? undefined,
      };
    }

    const phone = result.phoneNumber;
    if (!phone) return { ok: false, errorCode: "NO_PHONE" };

    const { userId, role } = await ctx.runMutation(internal.users.upsertUserByPhone, {
      phone,
    });
    const jwt = await mintSessionJwt({ userId, phone, role });
    return { ok: true, userId, role, jwt };
  },
});

// Development-only shortcut used by the local browser QA flow. Both this action
// and the internal mutation it calls require an explicit Convex environment flag.
export const mockLogin = action({
  args: { role: mockRoleValidator },
  returns: v.object({
    jwt: v.string(),
    role: mockRoleValidator,
  }),
  handler: async (ctx, { role }): Promise<{ jwt: string; role: "seller" | "admin" }> => {
    if (process.env.ALLOW_MOCK_AUTH !== "true") {
      throw new Error("Mock authentication is disabled");
    }

    const mockUser = await ctx.runMutation(internal.users.upsertMockUser, { role });
    const jwt = await mintSessionJwt(mockUser);
    return { jwt, role };
  },
});
