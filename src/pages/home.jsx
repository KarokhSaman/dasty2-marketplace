import { usePaginatedQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import ProductCard from "@/components/buyer/ProductCard";
import VIPSpotlight from "@/components/buyer/VIPSpotlight";
import CategoryBar from "@/components/buyer/CategoryBar";
import MultiSelectMenu from "@/components/buyer/MultiSelectMenu";
import { SegmentedControl, Skeleton } from "@/components/ui";
import { Link } from "@tanstack/react-router";
import * as m from "@/paraglide/messages";
import { getCategoryLabel } from "@/lib/categories";
import { getAllBrands } from "@/lib/brands";
import { getCityLabel } from "@/lib/cities";
import { getLocale } from "@/paraglide/runtime";
import { seedProductCache } from "@/lib/productCache";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";
import {
  useHomeStatePersistence,
  restoreScroll,
  DEFAULT_PAGE_SIZE,
} from "@/lib/useHomeStatePersistence";

// Runs synchronously before paint on the client (so restored scroll is in place
// before a View Transition snapshots the page), but degrades to useEffect on the
// server to avoid the SSR layout-effect warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Entrance animations (fade-up / stagger) should only play the first time the
// home screen is shown in a session — NOT when returning via the back button,
// where they would fight the shared-element morph and re-stagger the grid.
let homeEntranceShown = false;

// ── Reusable bits ──────────────────────────────────────────
function SortIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  );
}


function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M9 20v-6h6v6" />
    </svg>
  );
}

/** Row with City + Store filters (left) and Brand + Sort filters (right) — all multi-select */
function FiltersRow({ cities, setCities, availableCities, stores, setStores, publicStores, brands, setBrands, sort, setSort }) {
  const locale = getLocale();
  return (
    <div className={`flex items-center justify-between gap-2 mb-2.5 px-0.5`}>
      <div className="inline-flex items-center gap-1 min-w-0">
        <MultiSelectMenu
          label={m.citiesLabel()}
          allLabel={m.allCities()}
          leadingIcon={<PinIcon />}
          options={availableCities.map((c) => ({ value: c, label: getCityLabel(c, locale) ?? c }))}
          selected={cities}
          onChange={setCities}
        />
        <MultiSelectMenu
          label={m.storesLabel()}
          allLabel={m.storeAll()}
          leadingIcon={<StoreIcon />}
          options={(publicStores ?? []).map((st) => ({ value: st._id, label: st.name }))}
          selected={stores}
          onChange={setStores}
        />
      </div>
      <div className="inline-flex items-center gap-1 shrink-0">
        <MultiSelectMenu
          label={m.brandLabel()}
          allLabel={m.allBrands()}
          options={[...getAllBrands().map((b) => ({ value: b, label: b })), { value: "Other", label: "Other" }]}
          selected={brands}
          onChange={setBrands}
          align="end"
        />
        <SortMenu sort={sort} setSort={setSort} />
      </div>
    </div>
  );
}

/** Sort dropdown with icon only */
function SortMenu({ sort, setSort }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = sort !== "default";

  const sortOptions = [
    { value: "default",    label: m.sortDefault() },
    { value: "price_asc",  label: "↑ " + m.sortPriceLow() },
    { value: "price_desc", label: "↓ " + m.sortPriceHigh() },
  ];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentOption = sortOptions.find(o => o.value === sort) || sortOptions[0];
  const sortArrow = isActive ? (sort === "price_asc" ? "↑" : "↓") : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center gap-0.5 h-7 px-1.5 rounded-full border transition-all duration-200 ${
          isActive
            ? "border-[var(--color-ember-400)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)]"
            : "border-transparent bg-[var(--color-sand)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink)]"
        }`}
        title={currentOption?.label}
      >
        <SortIcon />
        {sortArrow && <span className="text-xs font-bold">{sortArrow}</span>}
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-[60] overflow-hidden min-w-[150px]">
          <div className="max-h-48 overflow-y-auto">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSort(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-3 w-full px-3 py-2 text-xs text-start whitespace-nowrap transition-colors ${
                  sort === opt.value
                    ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
              {opt.label}
              {sort === opt.value && (
                <svg className="w-3.5 h-3.5 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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

/** Brand multi-select dropdown component */

/** Row: condition tabs (left) + reset button (right) */
function ConditionRow({ condition, setCondition, hasActiveFilter, onReset }) {
  const conditionOptions = [
    { value: "all",  label: m.allItems() },
    { value: "new",  label: m.conditionNew() },
    { value: "likenew", label: m.conditionLikeNew() },
    { value: "used", label: m.conditionUsed() },
  ];

  return (
    <div className="relative z-50">
      <div className="flex items-center justify-between gap-1.5 mb-2.5 px-0.5">
        <SegmentedControl
          variant="underline"
          value={condition}
          onChange={setCondition}
          options={conditionOptions}
        />
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-ember-300)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)] hover:bg-[var(--color-ember-100)] hover:border-[var(--color-ember-400)] font-semibold text-[11px] whitespace-nowrap shrink-0 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {m.filterReset()}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center fade-up">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-[var(--color-ember-50)]" />
        <svg className="absolute inset-0 m-auto w-9 h-9 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="font-display text-2xl font-bold text-[var(--color-ink)] mb-2">{m.noProducts()}</p>
      <p className="text-sm text-[var(--color-ink-soft)] max-w-xs">{m.tryDifferent()}</p>
    </div>
  );
}

function EndDivider({ label }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-2">
      <div className="flex-1 h-px bg-[var(--color-hairline)]" />
      <p className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-[var(--color-ink-fade)]">{label}</p>
      <div className="flex-1 h-px bg-[var(--color-hairline)]" />
    </div>
  );
}

// ── Filters state ──────────────────────────────────────────
const INITIAL_FILTERS = {
  category: "all", condition: "all", sort: "default", cities: [], stores: [], brands: [],
};

export default function HomePage() {
  const { sellerId, ready } = useGlobalSellerSession();
  const locale = getLocale();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rotationTick, setRotationTick] = useState(0); // Trigger re-render every 15 seconds
  const [isRotating, setIsRotating] = useState(false); // Animation state
  const { category, condition, sort, brands } = filters;
  const cities = filters.cities ?? [];
  const stores = filters.stores ?? [];
  const updateFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const sentinelRef = useRef(null);
  // Shuffle seed — calculated after hydration to avoid server/client mismatch
  const shuffleSeedRef = useRef(0);
  const [hydrationTrigger, setHydrationTrigger] = useState(0); // Triggers re-render after hydration

  // Play entrance animations only on the first home view of the session — but
  // NOT during SSR / first hydration (the static HTML has no animation classes,
  // so adding them in the initial render would hydration-mismatch). Start false
  // to match the server, then trigger the animation once after mount.
  const [animateEntrance, setAnimateEntrance] = useState(false);
  useLayoutEffect(() => {
    // Initialize shuffle seed on client only (after hydration is complete)
    shuffleSeedRef.current = Math.random();
    setHydrationTrigger(1); // Trigger re-render to apply shuffle
    if (!homeEntranceShown) {
      homeEntranceShown = true;
      setAnimateEntrance(true);
    }
  }, []);


  const { initialItems, cachedFeatured, cachedResults, saveState } =
    useHomeStatePersistence(filters, setFilters, DEFAULT_PAGE_SIZE);

  // Featured is non-paginated → prefetched in the route loader (SSR + intent
  // preload) via React Query, still live-reactive. The paginated feed below
  // stays on usePaginatedQuery (convexQuery has no pagination).
  const { data: liveFeatured } = useReactQuery(convexQuery(api.products.getFeatured, {}));
  const { data: publicStores } = useReactQuery(convexQuery(api.stores.listPublic, {}));
  const rawFeaturedProducts = liveFeatured ?? cachedFeatured ?? [];

  // Apply random shuffle to featured products (same seed throughout page session)
  const applyClientRotation = (products) => {
    if (!products.length) return products;

    // Filter featured products by selected category
    const filteredProducts = category === "all"
      ? products
      : products.filter(p => p.category === category);

    // Group by position
    const positioned = filteredProducts.filter(p => p.featuredPosition !== undefined);
    const unpositioned = filteredProducts.filter(p => p.featuredPosition === undefined);

    const rotated = [];
    for (let pos = 1; pos <= 10; pos++) {
      const atPos = positioned
        .filter(p => p.featuredPosition === pos)
        .sort((a, b) => a._id.localeCompare(b._id));

      if (atPos.length > 0) {
        // Use fixed shuffle seed (generated once per page load, persists across category changes)
        const offset = Math.floor(shuffleSeedRef.current * atPos.length);
        rotated.push(...[...atPos.slice(offset), ...atPos.slice(0, offset)]);
      }
    }

    return [...rotated, ...unpositioned];
  };

  const featuredProducts = applyClientRotation(rawFeaturedProducts);

  // Featured products now rotate only on page refresh, not automatically every 10 seconds.
  // This eliminates flickering when switching categories.

  const { results: liveResults, status, loadMore } = usePaginatedQuery(
    api.products.getPublicPaginated,
    { category: category === "all" ? undefined : category },
    { initialNumItems: initialItems },
  );

  const results = (status === "LoadingFirstPage" && cachedResults && cachedResults.length > 0)
    ? cachedResults
    : liveResults;

  // Restore scroll before paint so a back-navigation View Transition snapshots
  // the page at the correct position (keeps the reverse photo-morph aligned).
  useIsoLayoutEffect(() => {
    const haveItems = results.length > 0 || featuredProducts.length > 0;
    restoreScroll(haveItems, status === "LoadingMore");
  });

  useEffect(() => {
    seedProductCache(results);
    seedProductCache(featuredProducts);
  }, [results, featuredProducts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && status === "CanLoadMore") loadMore(DEFAULT_PAGE_SIZE); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, loadMore]);

  const onSave = () => saveState({ results, featuredProducts });

  const featuredIds = useMemo(
    () => new Set(featuredProducts.map((p) => p._id)),
    [featuredProducts]
  );

  const availableCities = useMemo(() => {
    const set = new Set([...results, ...featuredProducts].map((p) => p.city).filter(Boolean));
    return [...set].sort();
  }, [results, featuredProducts]);

  const matchesFilters = (p, { skipCategory = false } = {}) => {
    const matchCond   = condition === "all" || p.condition === condition;
    const matchCity   = cities.length === 0 || cities.includes(p.city);
    const matchCat    = skipCategory ? true : (category === "all" || p.category === category);
    const matchBrand  = brands.length === 0 || (p.brand && brands.includes(p.brand));
    const matchStore  = stores.length === 0 || stores.includes(p.storeId);
    return matchCond && matchCity && matchCat && matchBrand && matchStore;
  };

  const applySort = (list) => {
    if (sort === "price_asc")  return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    // Default: sort by publication date (newest first)
    return [...list].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  };

  // Featured products for carousel — preserve position-based order from getFeatured query
  const featuredFiltered = useMemo(() => featuredProducts.filter((p) => matchesFilters(p, { skipCategory: category === "all" })),
    [featuredProducts, condition, cities, stores, brands, category]);

  // VIP Carousel products — all featured products (no filter awareness)
  const vipCarouselProducts = useMemo(() => {
    // Sort by featuredPosition to maintain order - show all featured regardless of filters
    return rawFeaturedProducts.sort((a, b) => (a.featuredPosition ?? 11) - (b.featuredPosition ?? 11));
  }, [rawFeaturedProducts]);

  // All products: featured products on top, then regular products
  const allProducts = useMemo(() => {
    // When category is "all", show featured with rotation at top. Otherwise filter by category.
    const skipCat = category === "all";
    const featured = featuredProducts.filter((p) => matchesFilters(p, { skipCategory: skipCat }));
    const featuredIds = new Set(featured.map(p => p._id));
    const regular = results.filter((p) => matchesFilters(p, { skipCategory: skipCat }) && !featuredIds.has(p._id));
    // Featured products on top (rotation only when category is "all"), then regular products
    const sortedFeatured = featured; // Already sorted by position in getFeatured query
    const combined = [...sortedFeatured, ...applySort(regular)];
    return combined;
  }, [featuredProducts, results, condition, sort, cities, stores, category, brands]);
  const totalCount = allProducts.length;


  const isLoading =
    status === "LoadingFirstPage" &&
    featuredProducts.length === 0 &&
    !(cachedResults && cachedResults.length > 0);

  return (
    <div className="pb-6">
      <div className={`mb-1 ${animateEntrance ? "fade-up" : ""}`}>
        <CategoryBar selected={category} onSelect={updateFilter("category")} />
      </div>

      <FiltersRow
        cities={cities}
        setCities={updateFilter("cities")}
        availableCities={availableCities}
        stores={stores}
        setStores={updateFilter("stores")}
        publicStores={publicStores}
        brands={brands}
        setBrands={updateFilter("brands")}
        sort={sort}
        setSort={updateFilter("sort")}
      />

      {!isLoading && (
        <ConditionRow
          condition={condition}
          setCondition={updateFilter("condition")}
          hasActiveFilter={
            condition !== "all" || cities.length > 0 || stores.length > 0 || sort !== "default" || category !== "all" || brands.length > 0
          }
          onReset={() => setFilters(INITIAL_FILTERS)}
        />
      )}

      {/* VIP Spotlight - Modern Featured Product Hero (desktop only, min 5 products) */}
      {vipCarouselProducts.length >= 5 && (
        <VIPSpotlight
          products={vipCarouselProducts}
          onViewProduct={() => onSave?.()}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton.ProductCard key={i} />)}
        </div>
      )}

      {!isLoading && allProducts.length === 0 && featuredFiltered.length === 0 && <EmptyState />}

      {allProducts.length > 0 && (
        <div suppressHydrationWarning className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-1 transition-all duration-300 ${animateEntrance ? "stagger" : ""}`}>
          {allProducts.map((p) => (
            <ProductCard key={p._id} product={p} onSave={onSave} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {status === "LoadingMore" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.ProductCard key={i} />)}
        </div>
      )}

      {status === "Exhausted" && results.length > DEFAULT_PAGE_SIZE && (
        <EndDivider label="End" />
      )}

    </div>
  );
}
