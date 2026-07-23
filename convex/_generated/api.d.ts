/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminLogs from "../adminLogs.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as devUploads from "../devUploads.js";
import type * as http from "../http.js";
import type * as migrate from "../migrate.js";
import type * as migrateImages from "../migrateImages.js";
import type * as notifications from "../notifications.js";
import type * as offers from "../offers.js";
import type * as products from "../products.js";
import type * as r2 from "../r2.js";
import type * as seed from "../seed.js";
import type * as types from "../types.js";
import type * as users from "../users.js";
import type * as verifyspeed from "../verifyspeed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminLogs: typeof adminLogs;
  auth: typeof auth;
  authActions: typeof authActions;
  devUploads: typeof devUploads;
  http: typeof http;
  migrate: typeof migrate;
  migrateImages: typeof migrateImages;
  notifications: typeof notifications;
  offers: typeof offers;
  products: typeof products;
  r2: typeof r2;
  seed: typeof seed;
  types: typeof types;
  users: typeof users;
  verifyspeed: typeof verifyspeed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
