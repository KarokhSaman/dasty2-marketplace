import { defineApp } from "convex/server";
import { crons } from "convex/server";
import r2 from "@convex-dev/r2/convex.config";
import { api } from "./_generated/api";

const app = defineApp();
app.use(r2);

// Run cleanup of expired featured products every minute for testing (change to { minutes: 1440 } for daily in production)
crons.interval("cleanup-expired-featured", { minutes: 1 }, api.products.cleanupExpiredFeatured);

export default app;
