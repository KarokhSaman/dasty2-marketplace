import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  // Upload auth: Convex has no identity wiring in this app (no auth.config.ts;
  // product mutations trust their args), so this is intentionally permissive to
  // match the existing posture. Harden later by wiring Clerk -> Convex and
  // checking ctx.auth here.
  checkUpload: async () => {},
});
