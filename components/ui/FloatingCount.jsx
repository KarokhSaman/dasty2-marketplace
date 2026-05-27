import { useEffect, useState } from "react";

/**
 * Floating "X items" pill. Pinned to the top-end corner, just below the
 * sticky header — away from the bottom tab bar. Always visible while
 * results exist. Tapping it scrolls back to the top once you've scrolled.
 */
export default function FloatingCount({ count, label }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 120);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!count || count <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => scrolled && window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={scrolled ? "Scroll to top" : undefined}
      className="fixed end-3 sm:end-6 bottom-24 sm:bottom-6 z-30 inline-flex items-center gap-2 ps-3 pe-3.5 py-2 rounded-full bg-[var(--color-ink)] text-[var(--color-cream)] text-[12px] font-semibold tracking-wide shadow-[0_14px_30px_-10px_rgba(26,20,17,0.45)] fade-up transition-transform duration-200 hover:scale-[1.03] active:scale-95"
    >
      <svg className="w-3 h-3 text-[var(--color-ember-300)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 4h7v7H3zM14 4h7v7h-7zM3 13h7v7H3zM14 13h7v7h-7z" />
      </svg>
      {label ?? `${count} items`}
      {scrolled && (
        <svg className="w-3 h-3 opacity-80 scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </button>
  );
}
