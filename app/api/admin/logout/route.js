export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "dasty2-admin=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly",
    },
  });
}
