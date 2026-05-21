import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    seq: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    condition: v.union(v.literal("new"), v.literal("used")),
    price: v.number(),
    profit: v.number(),
    photos: v.array(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected"),
      v.literal("sold"), v.literal("paid")
    ),
    city: v.string(),
    sellerId: v.string(),
    sellerName: v.string(),
    sellerPhone: v.string(),
    featured: v.optional(v.boolean()),
    views: v.optional(v.number()),
    notes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    dateAdded: v.string(),
    dateSold: v.optional(v.string()),
  }),

  sellers: defineTable({
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    registeredAt: v.string(),
    isActive: v.boolean(),
  }),

  otpCodes: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  }),

  sales: defineTable({
    productId: v.string(),
    sellerName: v.string(),
    category: v.string(),
    condition: v.string(),
    salePrice: v.number(),
    profit: v.number(),
    dateAdded: v.string(),
    datePaid: v.string(),
  }),

  offers: defineTable({
    title:         v.string(),
    description:   v.string(),
    type:          v.union(v.literal("free"), v.literal("flat_fee")),
    flatFeeAmount: v.optional(v.number()),
    startDate:     v.string(),
    endDate:       v.string(),
    isActive:      v.boolean(),
    createdAt:     v.string(),
  }),

  adminLogs: defineTable({
    adminEmail:   v.string(),
    action:       v.string(),
    productId:    v.optional(v.string()),
    productTitle: v.optional(v.string()),
    sellerName:   v.optional(v.string()),
    price:        v.optional(v.number()),
    notes:        v.optional(v.string()),
    createdAt:    v.string(),
  }),

  notifications: defineTable({
    sellerId: v.string(),
    productId: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.string(),
    url: v.optional(v.string()),
  }),
});
