import { useState, useRef, useEffect, useMemo } from "react";

const MAX_RESULTS = 50;

// CustomSelect look-alike with a search box, for long lists (e.g. all sellers).
// Options are `{ value, label }`; the first option with value "" is kept pinned
// as the "none" choice. Search matches anywhere in the label.
export default function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const none = options.find((o) => o.value === "");

  const { shown, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = options.filter((o) => o.value !== "" && (!q || o.label.toLowerCase().includes(q)));
    return { shown: matches.slice(0, MAX_RESULTS), total: matches.length };
  }, [options, query]);

  const pick = (v) => { onChange(v); setOpen(false); };

  const rowCls = (active) =>
    `w-full flex items-center justify-between px-4 py-3 text-sm text-start transition-colors ${
      active
        ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
        : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
    }`;

  const check = (
    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-2.5 min-h-11 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors ${
          open ? "border-rose-400 ring-2 ring-rose-300" : "border-[var(--color-hairline)]"
        }`}
      >
        <span className={`truncate ${selected && selected.value !== "" ? "text-[var(--color-ink)]" : "text-[var(--color-ink-fade)]"}`}>
          {selected && selected.value !== "" ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-[var(--color-ink-fade)] transition-transform duration-200 shrink-0 ms-2 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] overflow-hidden">
          <div className="p-2 border-b border-[var(--color-hairline)]">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {none && !query && (
              <button type="button" onClick={() => pick("")} className={rowCls(value === "")}>
                {none.label}
                {value === "" && check}
              </button>
            )}
            {shown.map((opt) => (
              <button key={opt.value} type="button" onClick={() => pick(opt.value)} className={rowCls(opt.value === value)}>
                <span className="truncate">{opt.label}</span>
                {opt.value === value && check}
              </button>
            ))}
            {shown.length === 0 && (
              <p className="px-4 py-3 text-sm text-[var(--color-ink-fade)]">No results</p>
            )}
            {total > MAX_RESULTS && (
              <p className="px-4 py-2 text-xs text-[var(--color-ink-fade)] border-t border-[var(--color-hairline)]">
                Showing {MAX_RESULTS} of {total}. Keep typing to narrow it down.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
