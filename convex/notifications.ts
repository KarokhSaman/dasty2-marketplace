import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin, requireCurrentSeller } from "./auth";

async function authorizeNotificationOwner(
  ctx: QueryCtx | MutationCtx,
  sellerId: string,
) {
  if (sellerId === "ADMIN") {
    await requireAdmin(ctx);
    return;
  }

  const seller = await requireCurrentSeller(ctx);
  if (seller._id.toString() !== sellerId) {
    throw new Error("Unauthorized");
  }
}

export const getBySeller = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    await authorizeNotificationOwner(ctx, sellerId);
    return await ctx.db
      .query("notifications")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", sellerId))
      .collect();
  },
});

export const getUnreadCount = query({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    await authorizeNotificationOwner(ctx, sellerId);
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", sellerId))
      .collect();
    return all.filter((n) => !n.read).length;
  },
});

export const markAllRead = mutation({
  args: { sellerId: v.string() },
  handler: async (ctx, { sellerId }) => {
    await authorizeNotificationOwner(ctx, sellerId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_sellerId", (q) => q.eq("sellerId", sellerId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

export const create = mutation({
  args: {
    sellerId: v.string(),
    productId: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: new Date().toISOString(),
    });
  },
});
