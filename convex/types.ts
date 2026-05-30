import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("Strollers & Travel"),
  v.literal("Car Seats"),
  v.literal("Carry Cot"),
  v.literal("Bed"),
  v.literal("Feeding & Nursing"),
  v.literal("Bouncers & Swings"),
  v.literal("High Chairs"),
  v.literal("Toys & Play"),
  v.literal("Electronics & Monitors"),
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
);
export type UserRole = typeof userRoleValidator.type;
