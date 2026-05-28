import { useRef, useState } from "react";
import { useClickOutside } from "./useClickOutside";
import { useIsDesktop } from "./useMediaQuery";
import BottomSheet from "./BottomSheet";

/**
 * A compact dropdown styled like a filter pill — used for City/Sort/etc.
 * On desktop it opens an anchored dropdown; on mobile it opens a bottom sheet.
 *
 * Props:
 *   value:     currently-selected option `value`
 *   options:   array of `{ value, label }`
 *   onChange:  (value) => void
 *   leadingIcon — optional adornment inside the trigger
 *   align:     "start" | "end" — which side the desktop menu opens to
 *   variant:   "outline" | "ghost"
 *   title:     optional header for the mobile sheet
 *   activeWhen: predicate(value) — controls "active" styling. Defaults to `value !== options[0].value`.
 */
const VARIANT_STYLES = {
  outline: {
    active:   "border-[var(--color-ember-500)] bg-[var(--color-ember-500)] text-white",
    inactive: "border-[var(--color-hairline)] bg-white hover:border-[var(--color-ember-300)] text-[var(--color-ink)]",
  },
  ghost: {
    active:   "border-transparent bg-[var(--color-ember-500)] text-white",
    inactive: "border-transparent bg-[var(--color-cream-deep)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink)]",
  },
};

function CheckIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={`${className} text-[var(--color-ember-500)] shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function SelectMenu({
  value,
  options,
  onChange,
  leadingIcon,
  align = "start",
  variant = "outline",
  activeWhen,
  title,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const ref = useRef();
  useClickOutside(ref, () => setOpen(false), open && isDesktop);

  const current = options.find((o) => o.value === value) ?? options[0];
  const isActive = activeWhen ? activeWhen(value) : value !== options[0]?.value;
  const alignCls = align === "end" ? "end-0" : "start-0";
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.outline;

  const select = (v) => { onChange(v); setOpen(false); };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 text-[11.5px] font-semibold whitespace-nowrap tap ${
          isActive ? styles.active : styles.inactive
        }`}
      >
        {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
        {current?.label}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open && isDesktop ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Desktop: anchored dropdown */}
      {open && isDesktop && (
        <div
          className={`absolute ${alignCls} top-full mt-2 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-30 overflow-hidden min-w-[190px] scale-in origin-top`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={`flex items-center justify-between gap-4 w-full px-4 py-2.5 text-sm text-start whitespace-nowrap transition-colors ${
                value === opt.value
                  ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
                  : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
              }`}
            >
              {opt.label}
              {value === opt.value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {!isDesktop && (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={title}>
          <div className="py-1.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                className={`flex items-center justify-between gap-4 w-full px-5 py-3 text-[15px] text-start transition-colors ${
                  value === opt.value
                    ? "text-[var(--color-ember-700)] font-semibold"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
                {opt.label}
                {value === opt.value && <CheckIcon className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
