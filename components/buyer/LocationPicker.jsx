import { useState } from "react";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCityLabel } from "@/lib/cities";
import { BottomSheet } from "@/components/ui";

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
    <svg className="w-4 h-4 text-[var(--color-ember-500)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Location button + city picker. Opens a bottom sheet on mobile and a centered
 * dialog on desktop (via the shared BottomSheet primitive).
 */
export default function LocationPicker({ city, setCity, availableCities }) {
  const locale = getLocale();
  const [open, setOpen] = useState(false);
  const currentLabel = city === "all" ? m.allCities() : (getCityLabel(city, locale) ?? city);
  const isActive = city !== "all";

  const options = [
    { value: "all", label: m.allCities() },
    ...availableCities.map((c) => ({ value: c, label: getCityLabel(c, locale) ?? c })),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`shrink-0 h-10 inline-flex items-center gap-1.5 px-3 rounded-xl border text-[13px] font-semibold whitespace-nowrap transition-colors tap ${
          isActive || open
            ? "border-[var(--color-ember-500)] bg-[var(--color-ember-500)] text-white"
            : "border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ember-300)]"
        }`}
      >
        <PinIcon className="w-4 h-4 shrink-0" />
        <span className="max-w-[6rem] truncate">{currentLabel}</span>
        <svg className="w-3 h-3 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={m.registerCityLabel()}>
        <div className="py-1.5">
          {options.map((opt) => {
            const active = city === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setCity(opt.value); setOpen(false); }}
                className={`flex items-center justify-between gap-3 w-full px-5 py-3 text-[15px] text-start transition-colors ${
                  active
                    ? "text-[var(--color-ember-700)] font-semibold"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
                {opt.label}
                {active && <CheckIcon />}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
