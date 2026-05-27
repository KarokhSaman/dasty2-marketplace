import { useRef, useState } from "react";
import { useClickOutside } from "./useClickOutside";

/**
 * A small dropdown menu styled like a filter pill — used for City/Sort/etc.
 *
 * Props:
 *   value:     currently-selected option `value`
 *   options:   array of `{ value, label }`
 *   onChange:  (value) => void
 *   leadingIcon, trailingIcon — optional adornments inside the trigger
 *   align:     "start" | "end" — which side the menu opens to (defaults "start")
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

export default function SelectMenu({
  value,
  options,
  onChange,
  leadingIcon,
  align = "start",
  variant = "outline",
  activeWhen,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useClickOutside(ref, () => setOpen(false), open);

  const current = options.find((o) => o.value === value) ?? options[0];
  const isActive = activeWhen ? activeWhen(value) : value !== options[0]?.value;
  const alignCls = align === "end" ? "end-0" : "start-0";
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.outline;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 text-[11.5px] font-semibold whitespace-nowrap ${
          isActive ? styles.active : styles.inactive
        }`}
      >
        {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
        {current?.label}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute ${alignCls} top-full mt-2 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(26,20,17,0.30)] z-30 overflow-hidden min-w-[190px] scale-in origin-top`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center justify-between gap-4 w-full px-4 py-2.5 text-sm text-start whitespace-nowrap transition-colors ${
                value === opt.value
                  ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
                  : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
              }`}
            >
              {opt.label}
              {value === opt.value && (
                <svg className="w-3.5 h-3.5 text-[var(--color-ember-500)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
