import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

export const create = mutation({
  args: {
    action:       v.string(),
    productId:    v.optional(v.string()),
    productTitle: v.optional(v.string()),
    productCode:  v.optional(v.string()),
    sellerName:   v.optional(v.string()),
    price:        v.optional(v.number()),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, email: identityEmail } = await requireAdmin(ctx);

    // Try to get email from identity, fall back to user email from database
    let adminEmail = identityEmail;
    if (!adminEmail) {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("clerkUserId"), identity?.userId))
        .first();
      adminEmail = user?.email ?? "";
    }

    await ctx.db.insert("adminLogs", {
      ...args,
      adminEmail,
      createdAt: new Date().toISOString(),
    });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("adminLogs").collect())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});
