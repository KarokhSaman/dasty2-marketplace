import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ value, onChange, options, placeholder, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-2.5 min-h-11 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors ${
          error ? "border-red-400" : open ? "border-rose-400 ring-2 ring-rose-300" : "border-[var(--color-hairline)]"
        }`}
      >
        <span className={selected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-fade)]"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-[var(--color-ink-fade)] transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-start transition-colors ${
                  opt.value === value
                    ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
                {opt.label}
                {opt.value === value && (
                  <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
