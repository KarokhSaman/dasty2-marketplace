import { cookies } from "next/headers";

export async function GET() {
  const raw = cookies().get("dasty2-admin")?.value ?? null;
  const email = raw ? decodeURIComponent(raw) : null;
  return Response.json({ email });
}
