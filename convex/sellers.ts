import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCurrentSeller,
  requireAdmin,
  requireCurrentSeller,
  requireIdentity,
} from "./auth";

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const { seller } = await getCurrentSeller(ctx);
    return seller;
  },
});

export const create = mutation({
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
      .query("sellers")
      .withIndex("by_clerkTokenIdentifier", (q) =>
        q.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("sellers", {
      ...args,
      clerkUserId: identity.subject,
      clerkTokenIdentifier: identity.tokenIdentifier,
      email: args.email ?? identity.email ?? undefined,
      address: args.address,
      isActive: true,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("sellers"), isActive: v.boolean() },
  handler: async (ctx, { id, isActive }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { isActive });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("sellers").collect();
  },
});

export const updateProfile = mutation({
  args: {
    name:    v.string(),
    phone:   v.string(),
    city:    v.string(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, { name, phone, city, address }) => {
    const seller = await requireCurrentSeller(ctx);
    await ctx.db.patch(seller._id, { name, phone, city, address });
  },
});

export const deleteSeller = mutation({
  args: { id: v.id("sellers") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
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
