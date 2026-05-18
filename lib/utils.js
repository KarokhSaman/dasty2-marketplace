export function formatPrice(price) {
  return price.toLocaleString("en-US") + " IQD";
}

export function calculateProfit(price) {
  const p = Number(price);
  if (p >= 5000 && p <= 9000) return 2000;
  if (p >= 10000 && p <= 29000) return 3000;
  if (p >= 30000 && p <= 49000) return 4000;
  if (p >= 50000 && p <= 99000) return 5000;
  if (p >= 100000 && p <= 199000) return 10000;
  if (p >= 200000 && p <= 299000) return 15000;
  if (p >= 300000 && p <= 399000) return 20000;
  if (p >= 400000 && p <= 499000) return 25000;
  if (p >= 500000 && p <= 1000000) return 30000;
  return 0;
}
