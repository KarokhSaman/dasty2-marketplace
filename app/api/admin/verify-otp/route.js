import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const ADMIN_EMAILS = ["karokh.saman.aziz@gmail.com", "soma.karam.a@gmail.com"];

export async function POST(request) {
  const { email, code } = await request.json();

  if (!email?.trim() || !code?.trim()) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
    return Response.json({ error: "not_admin" }, { status: 403 });
  }

  const result = await fetchMutation(api.otp.verify, {
    email: email.trim(),
    code: code.trim(),
  });

  if (!result.ok) {
    const msg = result.reason === "expired"
      ? "Code expired. Please request a new one."
      : "Invalid code. Please try again.";
    return Response.json({ error: msg }, { status: 401 });
  }

  const cookie = `dasty2-admin=${encodeURIComponent(email.trim())}; Path=/; Max-Age=86400; SameSite=Lax; HttpOnly`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
