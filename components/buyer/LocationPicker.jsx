import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCityLabel } from "@/lib/cities";
import { Popover } from "@/components/ui";

function PinIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-[var(--color-ember-500)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Location button + city picker popover. Always visible next to the search bar.
 * Shows the current city label inside the trigger.
 */
export default function LocationPicker({ city, setCity, availableCities }) {
  const locale = getLocale();
  const currentLabel = city === "all" ? m.allCities() : (getCityLabel(city, locale) ?? city);
  const isActive = city !== "all";

  const options = [
    { value: "all", label: m.allCities() },
    ...availableCities.map((c) => ({ value: c, label: getCityLabel(c, locale) ?? c })),
  ];

  return (
    <Popover
      align="end"
      width="w-[200px] sm:w-[220px]"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={`shrink-0 h-10 inline-flex items-center gap-1.5 px-3 rounded-xl border text-[13px] font-semibold whitespace-nowrap transition-colors ${
            isActive || open
              ? "border-[var(--color-ember-500)] bg-[var(--color-ember-500)] text-white"
              : "border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ember-300)]"
          }`}
        >
          <PinIcon className="w-4 h-4 shrink-0" />
          <span className="max-w-[6rem] truncate">{currentLabel}</span>
          <svg className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    >
      {({ close }) => (
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {options.map((opt) => {
            const active = city === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setCity(opt.value); close(); }}
                className={`flex items-center justify-between gap-3 w-full px-4 py-2.5 text-[13.5px] text-start transition-colors ${
                  active
                    ? "bg-[var(--color-ember-50)] text-[var(--color-ember-700)] font-semibold"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
                {opt.label}
                {active && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
