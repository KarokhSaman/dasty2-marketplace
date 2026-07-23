import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export function identityEmail(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  // VerifySpeed session JWTs carry phone/role, not email — this is usually
  // empty now. Kept so admin-log helpers can still prefer an identity email
  // when one is present, falling back to the user doc's email.
  return identity.email?.toLowerCase() ?? "";
}

// Session JWTs (minted in convex/authActions.ts) set `sub` = the Convex
// `users._id`, so the current user is a direct document lookup by subject.
export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { identity: null, user: null };
  const user = await ctx.db.get(identity.subject as Id<"users">);
  return { identity, user };
}

export async function requireCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const { user } = await getCurrentUser(ctx);
  if (!user || !user.isActive) throw new Error("Unauthorized");
  return user;
}

export function isAdminUser(user: Doc<"users"> | null) {
  return !!user && (user.role === "admin" || user.role === "super_admin") && user.isActive;
}

export function isSuperAdminUser(user: Doc<"users"> | null) {
  return !!user && user.role === "super_admin" && user.isActive;
}

export async function requireAdmin(ctx: Ctx) {
  const { identity, user } = await getCurrentUser(ctx);
  if (!identity) throw new Error("Not authenticated");
  if (!isAdminUser(user)) throw new Error("Unauthorized");
  return { identity, user, email: identityEmail(identity) || user!.email?.toLowerCase() || "" };
}

export async function requireSuperAdmin(ctx: Ctx) {
  const { identity, user } = await getCurrentUser(ctx);
  if (!identity) throw new Error("Not authenticated");
  if (!isSuperAdminUser(user)) throw new Error("Unauthorized");
  return { identity, user, email: identityEmail(identity) || user!.email?.toLowerCase() || "" };
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
