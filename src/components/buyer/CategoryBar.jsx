import { useEffect, useRef } from "react";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { getLocale } from "@/paraglide/runtime";
import { todayBaghdad } from "@/convex/discount";

const PEEK_KEY = "dasty2-catbar-peek-day"; // holds the date (Iraq time) it last played
const PEEK_DISTANCE = 76; // about one category icon

function glide(el, to, ms, isCancelled) {
  return new Promise((resolve) => {
    const from = el.scrollLeft;
    const start = performance.now();
    const step = (now) => {
      if (isCancelled()) return resolve();
      const t = Math.min(1, (now - start) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.scrollLeft = from + (to - from) * eased;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Once a day per device, slide the row about one icon along and back, so buyers
// see there are more categories to swipe to. Skipped when motion is reduced, when
// the row doesn't overflow, or if the buyer touches it first.
function useOneTimePeek(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const today = todayBaghdad();
    try {
      if (localStorage.getItem(PEEK_KEY) === today) return;
    } catch {
      // Storage blocked: still peek, just not remembered.
    }

    let cancelled = false;
    const cancel = () => { cancelled = true; };
    el.addEventListener("pointerdown", cancel, { passive: true });
    el.addEventListener("wheel", cancel, { passive: true });

    const timer = setTimeout(async () => {
      if (cancelled || el.scrollWidth <= el.clientWidth || el.scrollLeft !== 0) return;
      // Remember it only once it really plays (a cancelled first mount, as in
      // React's development double-mount, must not use up the visit's peek).
      try { localStorage.setItem(PEEK_KEY, today); } catch { /* not remembered */ }
      // In right-to-left pages the row scrolls the other way.
      const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
      await glide(el, dir * PEEK_DISTANCE, 520, () => cancelled);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 160));
      await glide(el, 0, 620, () => cancelled);
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      el.removeEventListener("pointerdown", cancel);
      el.removeEventListener("wheel", cancel);
    };
  }, [ref]);
}

export default function CategoryBar({ selected, onSelect }) {
  const locale = getLocale();
  const rowRef = useRef(null);
  useOneTimePeek(rowRef);

  return (
    <div className="-mx-4 sm:-mx-6 px-1 scroll-fade-x">
      <div ref={rowRef} data-catbar className="flex gap-2.5 sm:gap-3 overflow-x-auto py-1 px-4 sm:px-6 scrollbar-hide">
        {CATEGORY_CONFIG.map((cat) => {
          const isActive = selected === cat.value;
          const label = cat.labels?.[locale] ?? cat.labels?.en ?? cat.value;

          return (
            <button
              key={cat.value}
              onClick={() => onSelect(cat.value)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none w-14 sm:w-16"
              aria-pressed={isActive}
            >
              <div
                className={`w-[56px] h-[56px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--color-ember-50)] shadow-[inset_0_0_0_1px_var(--color-ember-200)] scale-[1.04]"
                    : "bg-[var(--color-sand)] group-hover:bg-[var(--color-ember-50)] group-hover:scale-[1.03]"
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
                className={`text-[10.5px] font-semibold text-center leading-[1.15] max-w-[70px] transition-colors ${
                  locale === "en" ? "whitespace-nowrap" : ""
                } ${
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
