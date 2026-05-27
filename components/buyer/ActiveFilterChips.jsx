import { Chip } from "@/components/ui";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCityLabel } from "@/lib/cities";

function XIcon() {
  return (
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Compact chip row of currently-active filters. Each chip removes its filter
 * when tapped. Renders nothing when nothing is active.
 *
 * Condition is intentionally not here — it lives in the visible tab strip.
 */
export default function ActiveFilterChips({
  city, setCity,
  sort, setSort,
}) {
  const locale = getLocale();
  const items = [];

  if (city !== "all") {
    items.push({
      key: "city",
      label: getCityLabel(city, locale) ?? city,
      clear: () => setCity("all"),
    });
  }
  if (sort !== "default") {
    items.push({
      key: "sort",
      label: sort === "price_asc" ? "↑ " + m.sortPriceLow() : "↓ " + m.sortPriceHigh(),
      clear: () => setSort("default"),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.clear}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-ember-50)] border border-[var(--color-ember-100)] text-[11.5px] font-semibold text-[var(--color-ember-700)] hover:bg-[var(--color-ember-100)] transition-colors"
        >
          {it.label}
          <XIcon />
        </button>
      ))}
    </div>
  );
}
