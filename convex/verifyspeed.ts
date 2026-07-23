// VerifySpeed REST client (server-side only — server-key must never reach a
// client). Docs: https://api.verifyspeed.com/v1/. Used by convex/authActions.ts.
//
// OTP flow: create (VerifySpeed sends the code) → validate-otp (VerifySpeed
// checks the code, returns a proof token + the verified phone number).

const BASE = "https://api.verifyspeed.com/v1";

function serverKey(): string {
  const key = process.env.VERIFYSPEED_SERVER_KEY;
  if (!key) throw new Error("VERIFYSPEED_SERVER_KEY is not set");
  return key;
}

async function problem(res: Response): Promise<string> {
  // Non-2xx responses are RFC 9457 problem+json.
  try {
    const body = (await res.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export type VsMethod = "whatsapp-otp" | "telegram-otp" | "sms-otp";
export type VsLanguage = "en" | "ar" | "ckb";

export interface VsCreateResult {
  methodName: string;
  verificationKey: string;
  deepLink: string | null;
}

export interface VsValidateResult {
  succeed: boolean;
  token: string | null;
  phoneNumber: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}

/** List methods available for the caller's IP (optional pre-check). */
export async function vsInitialize(
  clientIpv4: string,
): Promise<Array<{ methodName: string; displayName: string }>> {
  const res = await fetch(`${BASE}/verifications/initialize`, {
    method: "GET",
    headers: { "server-key": serverKey(), "client-ipv4-address": clientIpv4 },
  });
  if (!res.ok) throw new Error(`VerifySpeed initialize failed: ${await problem(res)}`);
  const body = (await res.json()) as {
    availableMethods: Array<{ methodName: string; displayName: string }>;
  };
  return body.availableMethods ?? [];
}

/** Start a verification. For OTP methods VerifySpeed sends the code now. */
export async function vsCreate(
  args: { methodName: VsMethod; language: VsLanguage; phoneNumber: string },
  clientIpv4: string,
): Promise<VsCreateResult> {
  const res = await fetch(`${BASE}/verifications/create`, {
    method: "POST",
    headers: {
      "server-key": serverKey(),
      "client-ipv4-address": clientIpv4,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`VerifySpeed create failed: ${await problem(res)}`);
  return (await res.json()) as VsCreateResult;
}

/** Validate an OTP code. Failures come back 200 with succeed:false + errorCode. */
export async function vsValidateOtp(args: {
  code: string;
  verificationKey: string;
}): Promise<VsValidateResult> {
  const res = await fetch(`${BASE}/verifications/validate-otp`, {
    method: "POST",
    headers: { "server-key": serverKey(), "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  // 401/403/404 etc. are hard failures (bad server-key / unknown key).
  if (!res.ok) throw new Error(`VerifySpeed validate-otp failed: ${await problem(res)}`);
  return (await res.json()) as VsValidateResult;
}
