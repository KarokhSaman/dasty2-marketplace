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

// Pass `original` (and `percent`) while a store discount runs: the old price is
// shown struck through next to the new one.
export default function PriceTag({
  amount,
  original = null,
  percent = null,
  size = "md",
  currency = "IQD",
  className = "",
}) {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="inline-flex items-baseline gap-1">
        <span className={`font-display font-bold text-[var(--color-ember-600)] leading-none ${s.num}`}>
          {formatAmount(amount)}
        </span>
        <span className={`font-bold text-[var(--color-ember-500)] tracking-wider uppercase ${s.unit}`}>
          {currency}
        </span>
      </span>
      {original !== null && (
        <span dir="ltr" className={`line-through text-[var(--color-ink-fade)] font-medium ${size === "xl" ? "text-lg" : "text-[11px]"}`}>
          {formatAmount(original)}
        </span>
      )}
      {percent !== null && (
        <span dir="ltr" className={`rounded-full bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-bold leading-none ${size === "xl" ? "text-sm px-2 py-1" : "text-[10px] px-1.5 py-0.5"}`}>
          -{percent}%
        </span>
      )}
    </span>
  );
}
