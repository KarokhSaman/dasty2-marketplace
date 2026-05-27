import { CATEGORY_CONFIG } from "@/lib/categories";
import { getLocale } from "@/src/paraglide/runtime";

export default function CategoryBar({ selected, onSelect }) {
  const locale = getLocale();

  return (
    <div className="-mx-4 sm:-mx-6 px-1 scroll-fade-x">
      <div data-catbar className="flex gap-2.5 sm:gap-3 overflow-x-auto py-1 px-4 sm:px-6 scrollbar-hide">
        {CATEGORY_CONFIG.map((cat) => {
          const isActive = selected === cat.value;
          const label = cat.labels?.[locale] ?? cat.labels?.en ?? cat.value;

          return (
            <button
              key={cat.value}
              onClick={() => onSelect(cat.value)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
              aria-pressed={isActive}
            >
              <div
                className={`w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--color-ember-50)] shadow-[inset_0_0_0_1px_var(--color-ember-200)] scale-[1.04]"
                    : "bg-[var(--color-cream-deep)] group-hover:bg-[var(--color-ember-50)] group-hover:scale-[1.03]"
                }`}
              >
                {cat.img ? (
                  <img
                    src={cat.img}
                    alt={label}
                    className={`w-9 h-9 object-contain transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                    }`}
                  />
                ) : (
                  <span className="text-xl">{cat.emoji}</span>
                )}
              </div>

              <span
                className={`text-[10.5px] font-semibold text-center leading-[1.15] max-w-[64px] transition-colors ${
                  isActive ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] group-hover:text-[var(--color-ink)]"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
