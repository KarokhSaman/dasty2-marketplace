import { mutation } from "./_generated/server";
import type { Category } from "./types";

// Old → current category names. Keys are free-form because legacy data may
// contain anything; values are pinned to the current `Category` union.
const CATEGORY_MAP: Record<string, Category> = {
  "Carrycot":       "Carry Cot",
  "Carrier":        "Carry Cot",
  "Carseat":        "Car Seats",
  "Electrics":      "Electronics & Monitors",
  "Fabric":         "Other",
  "Highchair":      "High Chairs",
  "Jolana":         "Bouncers & Swings",
  "Jumper":         "Bouncers & Swings",
  "Mastela":        "Bouncers & Swings",
  "Next2me":        "Bed",
  "Rawrawa":        "Bouncers & Swings",
  "Sisam":          "Other",
  "Shirdosh":       "Feeding & Nursing",
  "Stroller":       "Strollers & Travel",
  "Yary u sht":     "Toys & Play",
  "Other":          "Other",
  // Previous migration names → new names
  "Baby Carriers":  "Carry Cot",
  "Sleep & Bedtime":"Bed",
  // Removed category → Other
  "Clothing & Fabric": "Other",
};

export const migrateCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    for (const p of products) {
      const newCat = CATEGORY_MAP[p.category];
      if (newCat && newCat !== p.category) {
        await ctx.db.patch(p._id, { category: newCat });
        updated++;
      }
    }
    return `Updated ${updated} of ${products.length} products.`;
  },
});
