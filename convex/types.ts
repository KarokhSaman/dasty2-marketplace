import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("Stroller"),
  v.literal("Car Seat"),
  v.literal("Carry Cot"),
  v.literal("Crib"),
  v.literal("Cradle"),
  v.literal("Bassinet"),
  v.literal("Breast Pump"),
  v.literal("Bouncer"),
  v.literal("High Chair"),
  v.literal("Baby Walker"),
  v.literal("Toy"),
  v.literal("Electronic"),
  v.literal("Other"),
);
export type Category = typeof categoryValidator.type;

export const productStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("sold"),
  v.literal("paid"),
);
export type ProductStatus = typeof productStatusValidator.type;

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("likenew"),
  v.literal("used"),
);
export type Condition = typeof conditionValidator.type;

export const offerTypeValidator = v.union(
  v.literal("free"),
  v.literal("flat_fee"),
);
export type OfferType = typeof offerTypeValidator.type;

export const userRoleValidator = v.union(
  v.literal("seller"),
  v.literal("admin"),
  v.literal("super_admin"),
);
export type UserRole = typeof userRoleValidator.type;
