import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Resend } from "resend";

export async function POST(request) {
  const { email } = await request.json();
  if (!email?.trim()) {
    return Response.json({ error: "Email required" }, { status: 400 });
  }

  const code = await fetchMutation(api.otp.create, { email: email.trim() });

  // Always log to server console so you can develop without email setup
  console.log(`\n🔑  OTP for ${email.trim()} → ${code}\n`);

  // ── Send email via Resend (if key present) ────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: "Dasty2 Mndalan <noreply@dasty2mndalan.com>",
        to: email.trim(),
        subject: "Your login code — Dasty2 Mndalan",
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#e11d48;margin-bottom:8px">Dasty2 Mndalan</h2>
            <p style="color:#555;margin-bottom:24px">Your verification code:</p>
            <div style="font-size:40px;font-weight:bold;letter-spacing:8px;color:#111;background:#f9f9f9;border-radius:12px;padding:24px;text-align:center">
              ${code}
            </div>
            <p style="color:#999;font-size:13px;margin-top:24px">Valid for 10 minutes. Do not share this code.</p>
          </div>
        `,
      });
      if (error) console.warn("Resend error:", error.message);
    } catch (err) {
      console.warn("Resend failed:", err.message);
      // Don't block the user — they can still use the console OTP
    }
  }

  return Response.json({ ok: true });
}
