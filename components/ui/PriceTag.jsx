/**
 * Price renderer.  Sizes inherit from CSS classes so the same component fits
 * cards, hero stickers, and detail-page primary prices. Rendered in ink for a
 * clean, neutral look — the brand red is reserved for actions/active states.
 *
 *   <PriceTag amount={12500} />            // card-sized
 *   <PriceTag amount={12500} size="xl" />  // detail page
 */
const SIZES = {
  sm: { num: "text-[15px]", unit: "text-[9.5px]" },
  md: { num: "text-[18px]", unit: "text-[10px]" },
  lg: { num: "text-[19px]", unit: "text-[10px]" },
  xl: { num: "text-[40px] sm:text-[48px]", unit: "text-sm" },
};

export function formatAmount(amount) {
  return Number(amount).toLocaleString("en-US");
}

export default function PriceTag({
  amount,
  size = "md",
  currency = "IQD",
  className = "",
}) {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span className={`font-display font-bold text-[var(--color-ink)] leading-none ${s.num}`}>
        {formatAmount(amount)}
      </span>
      <span className={`font-bold text-[var(--color-ink-soft)] tracking-wider uppercase ${s.unit}`}>
        {currency}
      </span>
    </span>
  );
}
