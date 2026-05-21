import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request) {
  const { email, name, phone, city, address } = await request.json();

  if (!email || !name || !phone || !address) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const verified = await fetchQuery(api.otp.isVerified, { email: email.trim() });
  if (!verified) {
    return Response.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const sellerId = await fetchMutation(api.sellers.createWithEmail, {
    email:   email.trim(),
    name:    name.trim(),
    phone:   phone.trim(),
    city:    city?.trim() || "Erbil",
    address: address.trim(),
  });

  const cookie = `dasty2-seller=${sellerId}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
