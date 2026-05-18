import { cookies } from "next/headers";

export async function GET() {
  const sellerId = cookies().get("dasty2-seller")?.value ?? null;
  return Response.json({ sellerId });
}
