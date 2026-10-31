import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./auth";

// Admin buyer follow-up: an admin connects a buyer who asked about a product
// with its seller, then asks the seller whether it sold. Live posts nobody has
// confirmed for a while are checked with the seller too.

const DAY = 24 * 60 * 60 * 1000;
// Ask the seller whether it sold this long after the last buyer connection.
export const FOLLOW_UP_DAYS = 3;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export const connectBuyer = mutation({
  args: { id: v.id("products"), buyerPhone: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, buyerPhone }) => {
    const { user } = await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Product not found");
    const now = new Date().toISOString();
    const phone = buyerPhone?.trim() || undefined;
    await ctx.db.insert("buyerLeads", { productId: id, buyerPhone: phone, adminName: user!.name, createdAt: now });
    await ctx.db.patch(id, {
      leadCount: (product.leadCount ?? 0) + 1,
      lastLeadAt: now,
      // 3 days after the first unanswered buyer: later buyers don't push it
      // back, or a busy product would never be followed up.
      followUpAt: product.followUpAt ?? inDays(FOLLOW_UP_DAYS),
    });
    await ctx.db.insert("adminLogs", {
      action: "buyer_connected",
      productId: id.toString(),
      productTitle: product.title,
      productCode: product.seq,
      sellerName: product.sellerName,
      price: product.price,
      notes: phone ? `Buyer ${phone}` : undefined,
      adminName: user!.name,
      createdAt: now,
    });
    return null;
  },
});

// "Not yet": ask the seller again in a few days.
export const snoozeFollowUp = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { followUpAt: inDays(FOLLOW_UP_DAYS) });
    return null;
  },
});

// The seller says it is still for sale: no availability check for a while,
// and any open sold follow-up is closed.
export const confirmAvailable = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { availabilityCheckedAt: new Date().toISOString() });
    return null;
  },
});

// The buyers connected for a product, newest first (admin only).
export const listForProduct = query({
  args: { id: v.id("products") },
  returns: v.array(v.object({
    _id: v.id("buyerLeads"),
    buyerPhone: v.optional(v.string()),
    adminName: v.string(),
    createdAt: v.string(),
  })),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const leads = await ctx.db
      .query("buyerLeads")
      .withIndex("by_productId", (q) => q.eq("productId", id))
      .order("desc")
      .take(20);
    return leads.map(({ _id, buyerPhone, adminName, createdAt }) => ({ _id, buyerPhone, adminName, createdAt }));
  },
});
