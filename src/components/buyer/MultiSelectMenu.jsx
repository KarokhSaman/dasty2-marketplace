import { useRef, useState } from "react";
import { useClickOutside } from "@/components/ui/useClickOutside";
import FlipPanel from "@/components/ui/FlipPanel";

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Filter pill with a multi-select dropdown (City / Store / Brand on the home page).
 * `selected` is an array of option values; empty means "all". The menu stays open
 * while toggling so several options can be picked.
 */
// `single`: one choice at a time — picking an option replaces the choice and
// closes the menu, and the pill shows the chosen name.
export default function MultiSelectMenu({ label, allLabel, options, selected, onChange, leadingIcon, align = "start", single = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const count = selected.length;
  const isActive = count > 0;
  // The pill names the choice: "Erbil", or "Erbil +1" when more are picked.
  const pillLabel = count > 0 ? (options.find((o) => o.value === selected[0])?.label ?? selected[0]) : label;
  const more = single ? 0 : count - 1;

  const toggle = (value) => {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 text-[11.5px] font-semibold whitespace-nowrap ${
          isActive
            ? "border-[var(--color-ember-400)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)]"
            : "border-transparent bg-[var(--color-sand)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink)]"
        }`}
      >
        {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
        <span className="max-w-[104px] truncate">{pillLabel}</span>
        {more > 0 && <span dir="ltr">+{more}</span>}
        <svg className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <FlipPanel gap="2" height={240} className={`${align === "end" ? "end-0" : "start-0"} bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-[60] overflow-hidden min-w-[150px] scale-in origin-top`}>
          <div className="max-h-48 overflow-y-auto">
            {[{ value: "__all__", label: allLabel }, ...options].map((item) => {
              const isAll = item.value === "__all__";
              const isSelected = isAll ? count === 0 : selected.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { if (isAll) { onChange([]); if (single) setOpen(false); } else toggle(item.value); }}
                  className={`flex items-center justify-between gap-3 w-full px-3 py-2 text-xs text-start whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
                      : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                  }`}
                >
                  {item.label}
                  {isSelected && <CheckIcon />}
                </button>
              );
            })}
          </div>
        </FlipPanel>
      )}
    </div>
  );
}
