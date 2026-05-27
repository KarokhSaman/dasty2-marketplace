/**
 * Pill-shaped or underlined segmented control. Stateless — caller owns
 * `value` & `onChange`.
 *
 *   variant: "pill" (default)   — pill track, full-width children
 *           "underline"          — text tabs, content-width, ember underline on active
 */
function PillVariant({ value, onChange, options, className }) {
  return (
    <div className={`flex bg-[var(--color-cream-deep)] rounded-full p-0.5 gap-0.5 ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1 text-[12px] font-semibold rounded-full transition-all duration-200 ${
              isActive
                ? "bg-white text-[var(--color-ink)] shadow-[0_2px_8px_-2px_rgba(26,20,17,0.12)]"
                : "text-[var(--color-ink-fade)] hover:text-[var(--color-ink-soft)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function UnderlineVariant({ value, onChange, options, className }) {
  return (
    <div className={`inline-flex items-center gap-4 sm:gap-5 ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              isActive ? "text-[var(--color-ink)]" : "text-[var(--color-ink-fade)] hover:text-[var(--color-ink-soft)]"
            }`}
          >
            {opt.label}
            <span
              aria-hidden
              className={`absolute -bottom-px start-0 end-0 h-[2px] rounded-full transition-all duration-200 ${
                isActive ? "bg-[var(--color-ember-500)] scale-x-100 opacity-100" : "scale-x-0 opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function SegmentedControl({ variant = "pill", ...props }) {
  if (variant === "underline") return <UnderlineVariant {...props} />;
  return <PillVariant {...props} />;
}
