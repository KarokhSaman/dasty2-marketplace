import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    seq: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Carrycot"),
      v.literal("Carrier"),
      v.literal("Carseat"),
      v.literal("Electrics"),
      v.literal("Fabric"),
      v.literal("Highchair"),
      v.literal("Jolana"),
      v.literal("Jumper"),
      v.literal("Mastela"),
      v.literal("Next2me"),
      v.literal("Rawrawa"),
      v.literal("Sisam"),
      v.literal("Shirdosh"),
      v.literal("Stroller"),
      v.literal("Yary u sht"),
      v.literal("Other")
    ),
    condition: v.union(v.literal("new"), v.literal("used")),
    price: v.number(),
    profit: v.number(),
    photos: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("sold"),
      v.literal("paid")
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
    clerkUserId: v.string(),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    registeredAt: v.string(),
    isActive: v.boolean(),
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

  notifications: defineTable({
    sellerId: v.string(),
    productId: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.string(),
  }),
});
