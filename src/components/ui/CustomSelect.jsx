import { useState, useRef, useEffect } from "react";
import FlipPanel from "@/components/ui/FlipPanel";

const PANEL_CLS =
  "w-full bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] overflow-hidden";

// Options are { value, label } and may also carry `icon` (a small picture or
// badge shown before the label, also in the closed field) and `hint` (muted
// text at the end of the row, e.g. a count).
//
// `inline` opens the list in the page flow (pushing what is below it down) instead of
// floating over it — for dialogs and sheets, where a floating list gets cut off. A
// floating list opens above the field when there is no room below it.
export default function CustomSelect({ value, onChange, options, placeholder, error, inline = false, listClassName = "max-h-40", disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inline) ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [open, inline]);

  const selected = options.find(o => o.value === value);

  const list = (
    <div className={`${listClassName} overflow-y-auto`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 ${opt.icon ? "py-2" : "py-3"} text-sm text-start transition-colors ${
            opt.value === value
              ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
              : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
          }`}
        >
          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
          <span className="flex-1 min-w-0 truncate">{opt.label}</span>
          {opt.hint && <span className="shrink-0 text-xs font-medium text-[var(--color-ink-fade)]">{opt.hint}</span>}
          {opt.value === value && (
            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-2.5 min-h-11 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors disabled:cursor-not-allowed disabled:bg-[var(--color-cream-deep)]/60 ${
          disabled ? "" : "bg-white"
        } ${
          error ? "border-red-400" : open ? "border-rose-400 ring-2 ring-rose-300" : "border-[var(--color-hairline)]"
        }`}
      >
        <span className={`flex items-center gap-2.5 min-w-0 ${selected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-fade)]"}`}>
          {selected?.icon && <span className="shrink-0 -my-1">{selected.icon}</span>}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <svg
          className={`w-4 h-4 text-[var(--color-ink-fade)] transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && !disabled && (inline ? (
        <div className={`mt-1.5 ${PANEL_CLS}`}>{list}</div>
      ) : (
        <FlipPanel gap="1.5" height={200} className={`z-50 ${PANEL_CLS}`}>{list}</FlipPanel>
      ))}
    </div>
  );
}
