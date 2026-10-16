import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  categoryValidator,
  conditionValidator,
  feeModeValidator,
  offerTypeValidator,
  productStatusValidator,
  userRoleValidator,
} from "./types";

// TRANSITIONAL: `schemaValidation` is off so this final (narrowed) schema can be
// deployed over legacy Clerk-era rows — existing admins still carry
// `clerkTokenIdentifier`/`clerkUserId` and have no `phone` until
// `internal.migrate.migrateToVerifySpeed` runs. After the migration completes on
// every deployment, delete the options object below (re-enabling validation).
// See docs/verifyspeed-auth-migration.md §Operator runbook.
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
    mainPhotoIndex: v.optional(v.number()),
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
    // Store listings: product belongs to one of the seller's stores and may
    // carry a stock count. Missing stock = a single item, as before.
    storeId: v.optional(v.id("stores")),
    stock: v.optional(v.number()),
    // Set on the sold/paid entry created for one unit of a stocked listing, so
    // the unit can be returned to that listing's stock.
    soldFromId: v.optional(v.id("products")),
    // Set while status is "deletion_requested".
    deleteRequestedAt: v.optional(v.string()),
    deleteRequestReason: v.optional(v.string()),
  })
    .index("by_status",          ["status"])
    .index("by_status_category", ["status", "category"])
    .index("by_status_city",     ["status", "city"])
    .index("by_seller",          ["sellerId"])
    .index("by_store",           ["storeId"]),

  users: defineTable({
    role: userRoleValidator,
    email: v.optional(v.string()),
    name: v.string(),
    phone: v.string(), // E.164, unique login identity (VerifySpeed phone-OTP)
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    registeredAt: v.string(),
    isActive: v.boolean(),
    // Negotiated service-fee arrangement. Missing/"default" = price table (or
    // active platform offer). feeValue is IQD for "flat", 0-100 for "percentage".
    feeMode: v.optional(feeModeValidator),
    feeValue: v.optional(v.number()),
  })
    .index("by_role", ["role"])
    .index("by_role_and_isActive", ["role", "isActive"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),

  stores: defineTable({
    name: v.string(),
    sellerId: v.string(),
    // The store owner's own seller account: gets this store's products in its
    // dashboard, and its own listings are locked to this store.
    linkedUserId: v.optional(v.id("users")),
    // Where the store really is. Products under the store show this city no
    // matter which account posts them. Missing = the posting seller's city.
    city: v.optional(v.string()),
    feeMode: v.optional(feeModeValidator),
    feeValue: v.optional(v.number()),
    createdAt: v.string(),
  })
    .index("by_seller", ["sellerId"])
    .index("by_linked_user", ["linkedUserId"]),

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
  })
    .index("by_isActive", ["isActive"]),

  adminLogs: defineTable({
    adminName:    v.string(),
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
  })
    .index("by_sellerId", ["sellerId"])
    .index("by_productId", ["productId"]),
}, {
  // Remove this after migrateToVerifySpeed has run on all deployments.
  schemaValidation: false,
});
