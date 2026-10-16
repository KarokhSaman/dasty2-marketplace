// Store-wide percentage discount with a date range. Pure functions, shared by the
// server (public queries, sales) and the client (price display), so both always
// agree on the discounted price.

export type StoreDiscount = { percent: number; start: string; end: string };

const STEP = 250; // discounted prices are rounded to the nearest 250 IQD

// "Today" in Iraq (UTC+3) as YYYY-MM-DD, so a discount ends at Iraqi midnight.
export function todayBaghdad(now: number = Date.now()): string {
  return new Date(now + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isDiscountActive(d: StoreDiscount | null | undefined, today: string = todayBaghdad()): boolean {
  return !!d && d.percent > 0 && d.start <= today && today <= d.end;
}

export function discountedPrice(price: number, percent: number): number {
  return Math.max(STEP, Math.round((price * (1 - percent / 100)) / STEP) * STEP);
}

// What a buyer pays today: `original` and `percent` are set only while a
// discount is running and actually lowers the price.
export function priceInfo(
  product: { price: number; storeDiscount?: StoreDiscount | null },
  today: string = todayBaghdad(),
): { price: number; original: number | null; percent: number | null } {
  const d = product.storeDiscount;
  if (isDiscountActive(d, today)) {
    const price = discountedPrice(product.price, d!.percent);
    if (price < product.price) return { price, original: product.price, percent: d!.percent };
  }
  return { price: product.price, original: null, percent: null };
}
