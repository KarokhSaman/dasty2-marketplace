import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  getCurrentSeller as getCurrentSellerFromAuth,
  getCurrentUser,
  requireAdmin,
  requireCurrentSeller,
  requireIdentity,
  requireSuperAdmin,
} from "./auth";
import { userRoleValidator } from "./types";

function defaultUserName(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  return identity.name ?? identity.email ?? "User";
}

export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx): Promise<Doc<"users">> => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (q) =>
        q.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (existing) return existing;

    const id = await ctx.db.insert("users", {
      role: "seller",
      clerkTokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.userId ?? undefined,
      email: identity.email ?? undefined,
      name: defaultUserName(identity),
      registeredAt: new Date().toISOString(),
      isActive: true,
    });
    const user = await ctx.db.get(id);
    if (!user) throw new Error("User creation failed");
    return user;
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUser(ctx);
    return user;
  },
});

export const getCurrentSeller = query({
  args: {},
  handler: async (ctx) => {
    const { seller } = await getCurrentSellerFromAuth(ctx);
    return seller;
  },
});

export const createSeller = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
    registeredAt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (q) =>
        q.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (existing) {
      if (existing.role !== "seller") throw new Error("Unauthorized");
      await ctx.db.patch(existing._id, {
        email: args.email ?? identity.email ?? existing.email,
        name: args.name,
        phone: args.phone,
        city: args.city,
        address: args.address,
        clerkUserId: identity.userId ?? existing.clerkUserId,
        isActive: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      role: "seller",
      clerkTokenIdentifier: identity.tokenIdentifier,
      clerkUserId: identity.userId ?? undefined,
      email: args.email ?? identity.email ?? undefined,
      address: args.address,
      isActive: true,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(id);
    if (!user || user.role !== "seller") throw new Error("User not found");
    await ctx.db.patch(id, { isActive });
  },
});

export const setRole = mutation({
  args: { id: v.id("users"), role: userRoleValidator },
  handler: async (ctx, { id, role }) => {
    await requireAdmin(ctx);
    const { user: actingUser } = await getCurrentUser(ctx);
    const targetUser = await ctx.db.get(id);
    if (!actingUser || !targetUser) throw new Error("User not found");

    if (targetUser._id === actingUser._id && role === "seller") {
      throw new Error("You cannot remove your own admin access");
    }

    if ((targetUser.role === "admin" || targetUser.role === "super_admin") && role === "seller") {
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .take(2);
      const superAdmins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "super_admin"))
        .take(2);
      if (admins.length + superAdmins.length <= 1) {
        throw new Error("At least one admin is required");
      }
    }

    await ctx.db.patch(id, { role });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "seller"))
      .collect();
  },
});

export const getAdmins = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .order("desc")
      .take(100);
    const superAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .order("desc")
      .take(100);
    return [...superAdmins, ...admins];
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, { name, phone, city, address }) => {
    const seller = await requireCurrentSeller(ctx);
    await ctx.db.patch(seller._id, { name, phone, city, address });
  },
});

export const deleteSeller = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(id);
    if (!user || user.role !== "seller") throw new Error("User not found");

    const sellerIdStr = id as string;
    const products = await ctx.db
      .query("products")
      .withIndex("by_seller", (q) => q.eq("sellerId", sellerIdStr))
      .collect();
    for (const product of products) {
      const productNotifs = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("productId"), product._id as string))
        .collect();
      for (const n of productNotifs) await ctx.db.delete(n._id);
      await ctx.db.delete(product._id);
    }
    const sellerNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", sellerIdStr))
      .collect();
    for (const n of sellerNotifs) await ctx.db.delete(n._id);
    await ctx.db.delete(id);
  },
});

export const deleteAdmin = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await requireSuperAdmin(ctx);
    const { user: actingUser } = await getCurrentUser(ctx);
    const targetAdmin = await ctx.db.get(id);
    if (!targetAdmin || (targetAdmin.role !== "admin" && targetAdmin.role !== "super_admin")) {
      throw new Error("Admin not found");
    }
    if (targetAdmin._id === actingUser?._id) {
      throw new Error("You cannot delete your own admin account");
    }
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .take(1);
    const superAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .take(1);
    if (admins.length + superAdmins.length <= 1) {
      throw new Error("At least one admin is required");
    }

    // Clean up any data associated with this admin (if they were previously a seller)
    const adminIdStr = id as string;
    const products = await ctx.db
      .query("products")
      .withIndex("by_seller", (q) => q.eq("sellerId", adminIdStr))
      .collect();
    for (const product of products) {
      const productNotifs = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("productId"), product._id as string))
        .collect();
      for (const n of productNotifs) await ctx.db.delete(n._id);
      await ctx.db.delete(product._id);
    }
    const adminNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", adminIdStr))
      .collect();
    for (const n of adminNotifs) await ctx.db.delete(n._id);

    await ctx.db.delete(id);
  },
});
