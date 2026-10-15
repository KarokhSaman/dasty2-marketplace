export type FeeMode = "default" | "flat" | "percentage" | "none";

export type FeeArrangement = {
  feeMode?: FeeMode;
  feeValue?: number;
};

export type FeeOffer = {
  type: "free" | "flat_fee";
  flatFeeAmount?: number;
} | null;

export function tableProfit(price: number): number {
  if (price >= 5000 && price <= 9000) return 2000;
  if (price >= 10000 && price <= 29000) return 3000;
  if (price >= 30000 && price <= 49000) return 4000;
  if (price >= 50000 && price <= 99000) return 5000;
  if (price >= 100000 && price <= 199000) return 10000;
  if (price >= 200000 && price <= 299000) return 15000;
  if (price >= 300000 && price <= 399000) return 20000;
  if (price >= 400000 && price <= 499000) return 25000;
  if (price >= 500000 && price <= 1000000) return 30000;
  if (price > 1000000) return 35000;
  return 0;
}

// A seller with a negotiated arrangement (flat / percentage / none) always uses
// it, even during a platform-wide offer. Sellers on "default" get the active
// offer if there is one, otherwise the price table.
export function resolveProfit(
  price: number,
  seller: FeeArrangement | null | undefined,
  activeOffer: FeeOffer,
): number {
  switch (seller?.feeMode) {
    case "none":
      return 0;
    case "flat":
      return Math.max(0, Math.round(seller.feeValue ?? 0));
    case "percentage":
      return Math.max(0, Math.round((price * (seller.feeValue ?? 0)) / 100));
    default:
      if (activeOffer) {
        return activeOffer.type === "free" ? 0 : (activeOffer.flatFeeAmount ?? 0);
      }
      return tableProfit(price);
  }
}
