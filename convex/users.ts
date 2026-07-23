import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  getCurrentSeller as getCurrentSellerFromAuth,
  getCurrentUser,
  requireAdmin,
  requireCurrentSeller,
  requireCurrentUser,
  requireSuperAdmin,
} from "./auth";
import { userRoleValidator } from "./types";

const mockRoleValidator = v.union(v.literal("seller"), v.literal("admin"));

const MOCK_USERS = {
  seller: {
    phone: "+9647000000001",
    email: "seller.mock@dasty2.local",
    name: "Codex QA Seller",
    city: "Erbil",
    address: "Development test account",
  },
  admin: {
    phone: "+9647000000002",
    email: "admin.mock@dasty2.local",
    name: "Codex QA Admin",
    city: "Erbil",
    address: "Development test account",
  },
} as const;

// Phone-OTP login upsert (called by authActions.verifyOtp after VerifySpeed
// confirms the phone). Matches an existing user by phone — reusing admins and
// returning sellers without changing their role — else creates a new seller
// with an empty profile (filled later via complete-profile).
export const upsertUserByPhone = internalMutation({
  args: { phone: v.string() },
  returns: v.object({ userId: v.string(), role: userRoleValidator }),
  handler: async (
    ctx,
    { phone },
  ): Promise<{ userId: string; role: Doc<"users">["role"] }> => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) {
      return { userId: existing._id as string, role: existing.role };
    }
    const id = await ctx.db.insert("users", {
      role: "seller",
      phone,
      name: "",
      registeredAt: new Date().toISOString(),
      isActive: true,
    });
    return { userId: id as string, role: "seller" };
  },
});

// Deterministic accounts for local/dev browser testing. This is deliberately an
// internal mutation and independently gated, so it cannot be called by a client
// or enabled accidentally by adding only the mock-login UI.
export const upsertMockUser = internalMutation({
  args: { role: mockRoleValidator },
  returns: v.object({
    userId: v.string(),
    phone: v.string(),
    role: mockRoleValidator,
  }),
  handler: async (
    ctx,
    { role },
  ): Promise<{ userId: string; phone: string; role: "seller" | "admin" }> => {
    if (process.env.ALLOW_MOCK_AUTH !== "true") {
      throw new Error("Mock authentication is disabled");
    }

    const mock = MOCK_USERS[role];
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", mock.phone))
      .unique();
    const user = {
      role,
      phone: mock.phone,
      email: mock.email,
      name: mock.name,
      city: mock.city,
      address: mock.address,
      isActive: true,
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, user);
      return { userId: existing._id as string, phone: mock.phone, role };
    }

    const userId = await ctx.db.insert("users", {
      ...user,
      registeredAt: new Date().toISOString(),
    });
    return { userId: userId as string, phone: mock.phone, role };
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

// Fill in a new seller's profile after phone-OTP login. The user row already
// exists (created by upsertUserByPhone) with the verified phone and an empty
// name; the client only supplies the human-entered fields.
export const completeSellerProfile = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"users">["_id"]> => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "seller") throw new Error("Unauthorized");
    await ctx.db.patch(user._id, {
      name: args.name,
      city: args.city,
      address: args.address,
      email: args.email ?? user.email,
      isActive: true,
    });
    return user._id;
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
    city: v.string(),
    address: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { name, city, address }) => {
    const seller = await requireCurrentSeller(ctx);
    await ctx.db.patch(seller._id, { name, city, address });
    return null;
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
        .withIndex("by_productId", (q) => q.eq("productId", product._id as string))
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
        .withIndex("by_productId", (q) => q.eq("productId", product._id as string))
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
