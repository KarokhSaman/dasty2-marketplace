// Pixelence OTP REST client (server-side only — the API key must never reach a
// client). Docs: https://pixelence-group.com/docs/otp.md. Used by
// convex/authActions.ts for the WhatsApp login code; Telegram/SMS still go
// through VerifySpeed (convex/verifyspeed.ts).
//
// Flow: /v1/otp/send (Pixelence delivers the code over WhatsApp, returns a
// requestId) → /v1/otp/verify (checks the code against that requestId). Verify
// does NOT echo the phone back, so we remember requestId → phone ourselves
// (convex/pixelenceOtp.ts) and trust the stored value, never a client-supplied
// one.

const BASE = "https://api.pixelence-group.com";

// App-scoped OTP key. One value per Convex deployment: dev holds the dev app's
// key, prod the prod app's key (set with `npx convex env set PIXELENCE_API_KEY`).
function apiKey(): string {
  const key = process.env.PIXELENCE_API_KEY;
  if (!key) throw new Error("PIXELENCE_API_KEY is not set");
  return key;
}

// Errors use a simple { error, message? } envelope; message is optional.
async function problem(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.message ?? body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export type PxlChannel = "auto" | "whatsapp" | "telegram";

export interface PxlSendResult {
  requestId: string;
  status: string; // "pending"
  channel: string; // the channel that actually sent
  expiresAt: number; // Unix ms
  expiresInSeconds: number;
  replayed: boolean;
}

export interface PxlVerifyResult {
  verified: boolean;
  // verified | invalid | expired | too_many_attempts | not_found |
  // already_used | canceled
  status: string;
}

/** Send a code. For WhatsApp we pin channel=whatsapp (no Telegram fallback). */
export async function pxlSendOtp(args: {
  phone: string;
  channel: PxlChannel;
}): Promise<PxlSendResult> {
  const res = await fetch(`${BASE}/v1/otp/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
      // One logical send per call; a UUID satisfies the 16–128 char contract.
      "idempotency-key": crypto.randomUUID(),
    },
    body: JSON.stringify({ phone: args.phone, channel: args.channel }),
  });
  if (!res.ok) throw new Error(`Pixelence OTP send failed: ${await problem(res)}`);
  return (await res.json()) as PxlSendResult;
}

/** Verify a code. A wrong/expired/unknown code comes back 200/404 with
 *  verified:false + status; only hard auth/transport failures throw. */
export async function pxlVerifyOtp(args: {
  requestId: string;
  code: string;
}): Promise<PxlVerifyResult> {
  const res = await fetch(`${BASE}/v1/otp/verify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ requestId: args.requestId, code: args.code }),
  });
  // 404 => status:"not_found" with a normal body; treat as a failed attempt.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Pixelence OTP verify failed: ${await problem(res)}`);
  }
  return (await res.json()) as PxlVerifyResult;
}
