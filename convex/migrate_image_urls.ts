import { mutation } from "./_generated/server";
import { v } from "convex/values";

const MIGRATIONS = [
  {
    old: "dev.assets.dasty2mndalan.com",
    new: "dev-assets.mndallan.com",
    env: "development",
  },
  {
    old: "assets.dasty2mndalan.com",
    new: "assets.mndallan.com",
    env: "production",
  },
];

export const migrateImageUrls = mutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only show what would be changed, don't update
    environment: v.optional(v.string()), // "development" or "production" or "all"
  },
  returns: v.object({
    migratedCount: v.number(),
    totalProducts: v.number(),
    errors: v.array(v.string()),
    dryRun: v.boolean(),
    summary: v.string(),
  }),
  handler: async (ctx, { dryRun = false, environment = "development" }) => {
    let migratedCount = 0;
    let totalProducts = 0;
    const errors: string[] = [];

    try {
      // Determine which migrations to run
      const migrationsToRun = MIGRATIONS.filter(
        (m) => environment === "all" || m.env === environment
      );

      // Fetch all products
      const allProducts = await ctx.db.query("products").collect();
      totalProducts = allProducts.length;

      console.log(
        `[${dryRun ? "DRY RUN" : "RUNNING"}] Found ${totalProducts} products to check`
      );
      console.log(
        `Migrations: ${migrationsToRun.map((m) => `${m.old} → ${m.new}`).join("; ")}`
      );

      for (const product of allProducts) {
        if (!product.photos || product.photos.length === 0) continue;

        // Check if any photos use old domains
        let hasOldDomain = false;
        let updatedPhotos = [...product.photos];

        for (const migration of migrationsToRun) {
          const photosWithOldDomain = updatedPhotos.filter((url: string) =>
            url.includes(migration.old)
          );

          if (photosWithOldDomain.length > 0) {
            hasOldDomain = true;
            updatedPhotos = updatedPhotos.map((url: string) =>
              url.replace(migration.old, migration.new)
            );
          }
        }

        if (!hasOldDomain) continue;

        try {
          if (!dryRun) {
            // Update the product directly in database
            await ctx.db.patch(product._id, { photos: updatedPhotos });
          }

          migratedCount++;
          console.log(
            `${dryRun ? "[DRY RUN] Would migrate" : "Migrated"} product ${product._id}`
          );
        } catch (err) {
          const errorMsg = `Failed to migrate product ${product._id}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const summary = `${dryRun ? "[DRY RUN] " : ""}Migration complete: ${migratedCount}/${totalProducts} products ${dryRun ? "would be" : ""} updated`;
      console.log(summary);

      return { migratedCount, totalProducts, errors, dryRun, summary };
    } catch (err) {
      const errorMsg = `Migration failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  },
});
