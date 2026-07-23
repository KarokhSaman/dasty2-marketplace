import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCurrentSeller } from "./auth";

function requireMockAuthEnabled() {
  if (process.env.ALLOW_MOCK_AUTH !== "true") {
    throw new Error("Development uploads are disabled");
  }
}

// R2 credentials and browser CORS are external infrastructure concerns. Use
// Convex's development storage for mock-account browser QA so stale R2
// credentials cannot block the rest of the authenticated product workflow.
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    requireMockAuthEnabled();
    await requireCurrentSeller(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveUrl = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { storageId }) => {
    requireMockAuthEnabled();
    await requireCurrentSeller(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});
