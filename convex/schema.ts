import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  categoryValidator,
  conditionValidator,
  offerTypeValidator,
  productStatusValidator,
  userRoleValidator,
} from "./types";

export default defineSchema({
  products: defineTable({
    seq: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    brand: v.optional(v.string()),
    condition: conditionValidator,
    price: v.number(),
    profit: v.number(),
    photos: v.array(v.string()),
    status: productStatusValidator,
    city: v.string(),
    sellerId: v.string(),
    sellerName: v.string(),
    sellerPhone: v.string(),
    featured:      v.optional(v.boolean()),
    featuredUntil: v.optional(v.string()), // "YYYY-MM-DD" — undefined means indefinite
    featuredAt:    v.optional(v.string()), // ISO timestamp when featured
    featuredPosition: v.optional(v.number()), // 1-10 position in carousel, undefined = date-sorted
    pinned:        v.optional(v.boolean()), // Deprecated - kept for backward compatibility with existing data
    pinnedUntil:   v.optional(v.string()), // Deprecated - kept for backward compatibility
    pinnedAt:      v.optional(v.string()), // Deprecated - kept for backward compatibility
    views: v.optional(v.number()),
    notes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    dateAdded: v.string(),
    dateSold: v.optional(v.string()),
  })
    .index("by_status",          ["status"])
    .index("by_status_category", ["status", "category"])
    .index("by_seller",          ["sellerId"]),

  users: defineTable({
    role: userRoleValidator,
    clerkTokenIdentifier: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.string(),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    registeredAt: v.string(),
    isActive: v.boolean(),
  })
    .index("by_role", ["role"])
    .index("by_role_and_isActive", ["role", "isActive"])
    .index("by_clerkTokenIdentifier", ["clerkTokenIdentifier"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"]),

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
    type:          offerTypeValidator,
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
    productCode:  v.optional(v.string()),
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
  }).index("by_sellerId", ["sellerId"]),
});
