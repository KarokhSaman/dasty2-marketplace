"use client";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useRef, useEffect } from "react";
import ProductCard from "@/components/buyer/ProductCard";
import CategoryBar from "@/components/buyer/CategoryBar";
import { useT } from "@/lib/i18n/LocaleProvider";
import { getCityLabel } from "@/lib/cities";
import { getCategorySearchStrings } from "@/lib/categories";

function CityDropdown({ city, setCity, cities, t, locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = city === "all" ? t.allCities : (getCityLabel(city, locale) ?? city);
  const options = [
    { value: "all", label: t.allCities },
    ...cities.map((c) => ({ value: c, label: getCityLabel(c, locale) ?? c })),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors text-xs font-medium whitespace-nowrap ${
          city !== "all"
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-gray-200 bg-white hover:border-rose-300 text-gray-700"
        }`}
      >
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        {label}
        <svg className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute start-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden min-w-[160px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setCity(opt.value); setOpen(false); }}
              className={`flex items-center justify-between gap-4 w-full px-4 py-2.5 text-sm text-start whitespace-nowrap transition-colors ${
                city === opt.value
                  ? "bg-rose-50 text-rose-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
              {city === opt.value && (
                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortDropdown({ sort, setSort, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { value: "default",    label: t.sortDefault },
    { value: "price_asc",  label: "↑ " + t.sortPriceLow },
    { value: "price_desc", label: "↓ " + t.sortPriceHigh },
  ];
  const current = options.find((o) => o.value === sort) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-rose-300 transition-colors text-xs font-medium text-gray-700 whitespace-nowrap"
      >
        {current.label}
        <svg className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden min-w-[190px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setOpen(false); }}
              className={`flex items-center justify-between gap-4 w-full px-4 py-2.5 text-sm text-start whitespace-nowrap transition-colors ${
                sort === opt.value
                  ? "bg-rose-50 text-rose-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
              {sort === opt.value && (
                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


const HOME_STATE_KEY   = "dasty2-home-state";
const HOME_SCROLL_KEY  = "dasty2-home-scroll";
const HOME_CATBAR_KEY  = "dasty2-catbar-scroll";
const HOME_COUNT_KEY   = "dasty2-home-count";

const PAGE_SIZE = 24;

export default function HomePage() {
  const { t, locale } = useT();
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("all");
  const [condition, setCondition] = useState("all");
  const [sort, setSort]           = useState("default");
  const [city, setCity]           = useState("all");
  const sentinelRef = useRef(null);

  // Read saved result count synchronously so usePaginatedQuery starts
  // with enough items to reach the saved scroll position immediately
  const [initialItems] = useState(() => {
    const saved = sessionStorage.getItem(HOME_COUNT_KEY);
    if (saved) { sessionStorage.removeItem(HOME_COUNT_KEY); return Math.max(PAGE_SIZE, Number(saved)); }
    return PAGE_SIZE;
  });

  // Featured products — separate query so they always appear at top
  const featuredProducts = useQuery(api.products.getFeatured) ?? [];

  // Paginated query — resets automatically when category changes
  const { results, status, loadMore } = usePaginatedQuery(
    api.products.getPublicPaginated,
    { category: category === "all" ? undefined : category },
    { initialNumItems: initialItems },
  );

  // Restore filters immediately on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(HOME_STATE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(HOME_STATE_KEY);
    const { search: s, category: c, condition: co, sort: so, city: ci } = JSON.parse(raw);
    if (s  !== undefined) setSearch(s);
    if (c  !== undefined) setCategory(c);
    if (co !== undefined) setCondition(co);
    if (so !== undefined) setSort(so);
    if (ci !== undefined) setCity(ci);
    // scrollY stays in HOME_SCROLL_KEY — restored below once products load
  }, []);

  // Scroll restoration — no dependency array so it runs after every render.
  // Guards: only fires when products are loaded AND a scroll key exists.
  // After restoring, removes the key so subsequent renders skip it.
  // Handles both fresh-mount and router-cache cases.
  useEffect(() => {
    if (status === "LoadingFirstPage" || status === "LoadingMore") return;
    const y    = sessionStorage.getItem(HOME_SCROLL_KEY);
    const catX = sessionStorage.getItem(HOME_CATBAR_KEY);
    if (!y && !catX) return;
    if (y)    sessionStorage.removeItem(HOME_SCROLL_KEY);
    if (catX) sessionStorage.removeItem(HOME_CATBAR_KEY);
    const id = requestAnimationFrame(() => {
      if (y) window.scrollTo({ top: Number(y), behavior: "instant" });
      if (catX) {
        const el = document.querySelector("[data-catbar]");
        if (el) el.scrollLeft = Number(catX);
      }
    });
    return () => cancelAnimationFrame(id);
  }); // intentionally no deps

  // Auto-load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && status === "CanLoadMore") loadMore(PAGE_SIZE); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, loadMore]);

  function saveState() {
    const y      = String(window.scrollY);
    const catBar = document.querySelector("[data-catbar]");
    const catX   = String(catBar?.scrollLeft ?? 0);
    sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify({ search, category, condition, sort, city, scrollY: y }));
    sessionStorage.setItem(HOME_SCROLL_KEY, y);
    sessionStorage.setItem(HOME_CATBAR_KEY, catX);
    sessionStorage.setItem(HOME_COUNT_KEY,  String(results.length)); // restore same number of items
  }

  // Set of featured product IDs so we can exclude them from the regular grid
  const featuredIds = useMemo(
    () => new Set(featuredProducts.map(p => p._id)),
    [featuredProducts]
  );

  // Unique sorted city list derived from all loaded products
  const availableCities = useMemo(() => {
    const set = new Set([...results, ...featuredProducts].map(p => p.city).filter(Boolean));
    return [...set].sort();
  }, [results, featuredProducts]);

  // Client-side filter for search + condition + city on the paginated feed
  // Featured products are excluded from this list (they have their own section)
  const regular = useMemo(() => {
    const q = search.toLowerCase();
    let list = results.filter(p => {
      if (featuredIds.has(p._id)) return false;
      const catStrings  = getCategorySearchStrings(p.category);
      const matchSearch = !q || p.title.toLowerCase().includes(q) || catStrings.some(s => s.includes(q));
      const matchCond   = condition === "all" || p.condition === condition;
      const matchCity   = city === "all" || p.city === city;
      return matchSearch && matchCond && matchCity;
    });
    if (sort === "price_asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [results, search, condition, sort, city, featuredIds]);

  // Featured section filtered by search + condition + city too
  const featured = useMemo(() => {
    const q = search.toLowerCase();
    let list = featuredProducts.filter(p => {
      const catStrings  = getCategorySearchStrings(p.category);
      const matchSearch = !q || p.title.toLowerCase().includes(q) || catStrings.some(s => s.includes(q));
      const matchCond   = condition === "all" || p.condition === condition;
      const matchCat    = category === "all" || p.category === category;
      const matchCity   = city === "all" || p.city === city;
      return matchSearch && matchCond && matchCat && matchCity;
    });
    if (sort === "price_asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [featuredProducts, search, condition, sort, category, city]);

  const filtered = useMemo(() => [...featured, ...regular], [featured, regular]);

  const isLoading = status === "LoadingFirstPage" && featuredProducts.length === 0;

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 pe-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Condition filter — segmented control */}
      <div className="flex mb-4 bg-gray-100 rounded-2xl p-1 gap-1">
        {[
          { value: "all",  label: t.allItems },
          { value: "new",  label: t.conditionNew },
          { value: "used", label: t.conditionUsed },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCondition(value)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              condition === value
                ? "bg-white text-rose-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category icons bar */}
      <div className="mb-5">
        <CategoryBar selected={category} onSelect={setCategory} />
      </div>

      {/* City + Sort filter row */}
      {!isLoading && (
        <div className="flex items-center justify-between gap-2 mb-4">
          <CityDropdown city={city} setCity={setCity} cities={availableCities} t={t} locale={locale} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">{t.sortBy}</span>
            <SortDropdown sort={sort} setSort={setSort} t={t} />
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium text-gray-400">{t.noProducts}</p>
          <p className="text-sm mt-1 text-gray-300">{t.tryDifferent}</p>
        </div>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {t.featured}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => <ProductCard key={p._id} product={p} onSave={saveState} />)}
          </div>
        </div>
      )}

      {/* Main grid */}
      {regular.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {regular.map((p) => <ProductCard key={p._id} product={p} onSave={saveState} />)}
        </div>
      )}

      {/* Sentinel — triggers next page load when visible */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading more indicator */}
      {status === "LoadingMore" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* End of results */}
      {status === "Exhausted" && results.length > PAGE_SIZE && (
        <p className="text-center text-xs text-gray-300 py-6">— {t.noProducts} —</p>
      )}
    </div>
  );
}
