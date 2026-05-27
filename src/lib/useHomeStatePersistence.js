import { useEffect, useState } from "react";

/**
 * Persists the buyer home page state (filters, scroll, paged-result count,
 * category-bar scroll, and cached query results) across navigations so the
 * back button restores instantly with no skeleton flash.
 *
 * Reads cached data SYNCHRONOUSLY on first render (so the page paints with
 * the right scroll height immediately) and removes the keys after read.
 */
const KEYS = {
  state:    "dasty2-home-state",
  scroll:   "dasty2-home-scroll",
  catbar:   "dasty2-catbar-scroll",
  count:    "dasty2-home-count",
  featured: "dasty2-home-featured-cache",
  results:  "dasty2-home-results-cache",
};

export const DEFAULT_PAGE_SIZE = 24;

function readCache(key) {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try { return JSON.parse(raw); } catch { return null; }
}

export function useHomeStatePersistence(filters, setFilters, pageSize = DEFAULT_PAGE_SIZE) {
  // Synchronously read saved item count so the paginated query asks for enough
  // items to reach the saved scroll position on first render.
  const [initialItems] = useState(() => {
    if (typeof window === "undefined") return pageSize;
    const saved = sessionStorage.getItem(KEYS.count);
    if (saved) { sessionStorage.removeItem(KEYS.count); return Math.max(pageSize, Number(saved)); }
    return pageSize;
  });

  const [cachedFeatured] = useState(() => readCache(KEYS.featured));
  const [cachedResults]  = useState(() => readCache(KEYS.results));

  // Restore filters on mount, exactly once.
  useEffect(() => {
    const raw = sessionStorage.getItem(KEYS.state);
    if (!raw) return;
    sessionStorage.removeItem(KEYS.state);
    try { setFilters(JSON.parse(raw)); } catch {}
  // setFilters identity is stable for our caller
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    initialItems,
    cachedFeatured,
    cachedResults,
    /** Snapshot current page state into sessionStorage before navigating away. */
    saveState({ results, featuredProducts }) {
      if (typeof window === "undefined") return;
      const y      = String(window.scrollY);
      const catBar = document.querySelector("[data-catbar]");
      const catX   = String(catBar?.scrollLeft ?? 0);
      sessionStorage.setItem(KEYS.state, JSON.stringify(filters));
      sessionStorage.setItem(KEYS.scroll, y);
      sessionStorage.setItem(KEYS.catbar, catX);
      sessionStorage.setItem(KEYS.count, String(results.length));
      try {
        sessionStorage.setItem(KEYS.featured, JSON.stringify(featuredProducts));
        sessionStorage.setItem(KEYS.results,  JSON.stringify(results));
      } catch {
        // sessionStorage quota — silently skip; UI will show shimmer on return
      }
    },
  };
}

/**
 * Restores window and category-bar scroll positions once products are loaded.
 * Call inside an effect with no deps so it runs after every render until the
 * keys are consumed.
 */
export function restoreScroll(haveItems, isLoadingMore) {
  if (!haveItems || isLoadingMore || typeof window === "undefined") return;
  const y    = sessionStorage.getItem(KEYS.scroll);
  const catX = sessionStorage.getItem(KEYS.catbar);
  if (!y && !catX) return;
  if (y)    sessionStorage.removeItem(KEYS.scroll);
  if (catX) sessionStorage.removeItem(KEYS.catbar);
  requestAnimationFrame(() => {
    if (y) window.scrollTo({ top: Number(y), behavior: "instant" });
    if (catX) {
      const el = document.querySelector("[data-catbar]");
      if (el) el.scrollLeft = Number(catX);
    }
  });
}
