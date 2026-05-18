import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request) {
  const { email, code } = await request.json();

  if (!email?.trim() || !code?.trim()) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify OTP
  const result = await fetchMutation(api.otp.verify, {
    email: email.trim(),
    code: code.trim(),
  });

  if (!result.ok) {
    const msg = result.reason === "expired"
      ? "Code has expired. Please request a new one."
      : "Invalid code. Please try again.";
    return Response.json({ error: msg }, { status: 401 });
  }

  // Check if seller exists
  const seller = await fetchQuery(api.sellers.getByEmail, { email: email.trim() });

  if (!seller) {
    // New seller — needs profile completion
    return Response.json({ ok: true, needsProfile: true });
  }

  if (!seller.isActive) {
    return Response.json({ error: "Account not active. Contact admin." }, { status: 403 });
  }

  // Returning seller — set session cookie
  const cookie = `dasty2-seller=${seller._id}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`;
  return new Response(JSON.stringify({ ok: true, needsProfile: false }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
