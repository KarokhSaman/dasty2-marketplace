import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export const ADMIN_EMAILS = [
  "karokh.saman.aziz@gmail.com",
  "soma.karam.a@gmail.com",
] as const;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export function identityEmail(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  return identity.email?.toLowerCase() ?? "";
}

export function isAdminIdentity(
  identity: Awaited<ReturnType<typeof requireIdentity>>,
) {
  return ADMIN_EMAILS.includes(identityEmail(identity) as (typeof ADMIN_EMAILS)[number]);
}

export async function requireAdmin(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  if (!isAdminIdentity(identity)) throw new Error("Unauthorized");
  return { identity, email: identityEmail(identity) };
}

export async function getCurrentSeller(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  const seller = await ctx.db
    .query("sellers")
    .withIndex("by_clerkTokenIdentifier", (q) =>
      q.eq("clerkTokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  return { identity, seller };
}

export async function requireCurrentSeller(ctx: Ctx): Promise<Doc<"sellers">> {
  const { seller } = await getCurrentSeller(ctx);
  if (!seller || !seller.isActive) throw new Error("Unauthorized");
  return seller;
}
