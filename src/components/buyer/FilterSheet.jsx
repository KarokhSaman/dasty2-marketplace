import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCityLabel } from "@/lib/cities";
import { Popover } from "@/components/ui";

// ── Trigger: icon button with badge when filters active ─────
export function FilterButton({ activeCount = 0, onClick, isOpen }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Filters"
      className={`relative shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-xl border transition-colors ${
        activeCount > 0 || isOpen
          ? "border-[var(--color-ember-500)] bg-[var(--color-ember-500)] text-white"
          : "border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ember-300)]"
      }`}
    >
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
      </svg>
      {activeCount > 0 && !isOpen && (
        <span className="absolute -top-1 -end-1 min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] font-bold bg-white text-[var(--color-ember-600)] rounded-full flex items-center justify-center ring-2 ring-[var(--color-cream)] shadow-sm">
          {activeCount}
        </span>
      )}
    </button>
  );
}

// ── Row inside the sheet ────────────────────────────────────
function OptionRow({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 w-full px-4 py-2.5 text-[13.5px] text-start transition-colors ${
        active
          ? "bg-[var(--color-ember-50)] text-[var(--color-ember-700)] font-semibold"
          : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
      }`}
    >
      {children}
      {active && (
        <svg className="w-3.5 h-3.5 text-[var(--color-ember-500)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-fade)]">
      {children}
    </p>
  );
}

// ── Full sheet ─────────────────────────────────────────────
export default function FilterSheet({
  city, setCity, availableCities,
  sort, setSort,
  activeCount, onReset,
}) {
  const locale = getLocale();

  const cityOptions = [
    { value: "all", label: m.allCities() },
    ...availableCities.map((c) => ({ value: c, label: getCityLabel(c, locale) ?? c })),
  ];

  const sortOptions = [
    { value: "default",    label: m.sortDefault() },
    { value: "price_asc",  label: "↑ " + m.sortPriceLow() },
    { value: "price_desc", label: "↓ " + m.sortPriceHigh() },
  ];

  return (
    <Popover
      align="end"
      width="w-[260px] sm:w-[280px]"
      trigger={({ open, toggle }) => (
        <FilterButton
          activeCount={activeCount}
          onClick={toggle}
          isOpen={open}
        />
      )}
    >
      {({ close }) => (
        <div className="max-h-[70vh] overflow-y-auto">
          <SectionLabel>{m.allCities()}</SectionLabel>
          <div className="pb-1">
            {cityOptions.map((opt) => (
              <OptionRow
                key={opt.value}
                active={city === opt.value}
                onClick={() => setCity(opt.value)}
              >
                {opt.label}
              </OptionRow>
            ))}
          </div>

          <div className="border-t border-[var(--color-hairline)]" />

          <SectionLabel>{m.sortBy().replace(":", "")}</SectionLabel>
          <div className="pb-1">
            {sortOptions.map((opt) => (
              <OptionRow
                key={opt.value}
                active={sort === opt.value}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </OptionRow>
            ))}
          </div>

          {activeCount > 0 && (
            <div className="sticky bottom-0 border-t border-[var(--color-hairline)] bg-white p-2">
              <button
                type="button"
                onClick={() => { onReset(); close(); }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-bold text-[var(--color-ember-600)] hover:bg-[var(--color-ember-50)] rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}
