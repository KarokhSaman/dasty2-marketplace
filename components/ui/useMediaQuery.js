import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook. Defaults to `false` on the server / first paint,
 * then resolves on mount — so initial markup is identical for SSR & hydration.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True at Tailwind's `sm` breakpoint and up (≥640px). */
export const useIsDesktop = () => useMediaQuery("(min-width: 640px)");
