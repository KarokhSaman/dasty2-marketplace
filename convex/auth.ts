import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export function identityEmail(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  return identity.email?.toLowerCase() ?? "";
}

export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { identity: null, user: null };

  // Try clerkUserId first (stable across sessions), then fall back to clerkTokenIdentifier
  let user = null;
  if (identity.userId) {
    user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.userId),
      )
      .unique();
  }

  if (!user) {
    user = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (q) =>
        q.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  }
  return { identity, user };
}

export async function requireCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const { user } = await getCurrentUser(ctx);
  if (!user || !user.isActive) throw new Error("Unauthorized");
  return user;
}

export function isAdminUser(user: Doc<"users"> | null) {
  return !!user && user.role === "admin" && user.isActive;
}

export async function requireAdmin(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  const { user } = await getCurrentUser(ctx);
  if (!isAdminUser(user)) throw new Error("Unauthorized");
  return { identity, email: identityEmail(identity) };
}

export async function getCurrentSeller(ctx: Ctx) {
  const { identity, user } = await getCurrentUser(ctx);
  const seller = user?.role === "seller" && user.isActive ? user : null;
  return { identity, seller };
}

export async function requireCurrentSeller(ctx: Ctx): Promise<Doc<"users">> {
  const { seller } = await getCurrentSeller(ctx);
  if (!seller || !seller.isActive) throw new Error("Unauthorized");
  return seller;
}
