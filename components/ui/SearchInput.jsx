/**
 * Search input with leading magnifier icon and trailing clear button.
 * Controlled — caller provides `value` and `onChange(value)`.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder,
  clearLabel = "Clear",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-fade)] pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-white border border-[var(--color-hairline)] rounded-xl ps-10 pe-9 text-[14px] sm:text-[14px] leading-tight text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-cream-deep)] hover:bg-[var(--color-ember-100)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
