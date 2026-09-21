import { mutation } from "./_generated/server";
import { v } from "convex/values";

const OLD_DOMAIN = "assets.dasty2mndalan.com";
const NEW_DOMAIN = "assets.mndallan.com";

export const migrateImageUrls = mutation({
  args: {},
  returns: v.object({
    migratedCount: v.number(),
    totalProducts: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    let migratedCount = 0;
    let totalProducts = 0;
    const errors: string[] = [];

    try {
      // Fetch all products
      const allProducts = await ctx.db.query("products").collect();

      totalProducts = allProducts.length;
      console.log(`Found ${totalProducts} products to check`);

      for (const product of allProducts) {
        if (!product.photos || product.photos.length === 0) continue;

        // Check if any photos use the old domain
        const hasOldDomain = product.photos.some((url: string) => url.includes(OLD_DOMAIN));
        if (!hasOldDomain) continue;

        try {
          // Replace old domain with new domain in all photos
          const updatedPhotos = product.photos.map((url: string) =>
            url.replace(OLD_DOMAIN, NEW_DOMAIN)
          );

          // Update the product directly in database
          await ctx.db.patch(product._id, { photos: updatedPhotos });

          migratedCount++;
          console.log(`Migrated product ${product._id}`);
        } catch (err) {
          const errorMsg = `Failed to migrate product ${product._id}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Migration complete: ${migratedCount}/${totalProducts} products updated`);
      return { migratedCount, totalProducts, errors };
    } catch (err) {
      const errorMsg = `Migration failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  },
});
