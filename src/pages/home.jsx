import { usePaginatedQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import ProductCard from "@/components/buyer/ProductCard";
import CategoryBar from "@/components/buyer/CategoryBar";
import LocationPicker from "@/components/buyer/LocationPicker";
import { SearchInput, SegmentedControl, SelectMenu, Skeleton } from "@/components/ui";
import { Link } from "@tanstack/react-router";
import * as m from "@/paraglide/messages";
import { getCategorySearchStrings } from "@/lib/categories";
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

function SearchRow({ search, setSearch, city, setCity, availableCities, animate }) {
  return (
    <div className={`relative z-30 flex items-stretch gap-2 mb-3 ${animate ? "fade-up" : ""}`}>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={m.searchPlaceholder()}
        clearLabel="Clear search"
        className="flex-1"
      />
      <LocationPicker city={city} setCity={setCity} availableCities={availableCities} />
    </div>
  );
}

/** Single row: condition tabs (left) + reset + sort (right). Count lives in FloatingCount. */
function MetaRow({ condition, setCondition, sort, setSort, hasActiveFilter, onReset }) {
  const conditionOptions = [
    { value: "all",  label: m.allItems() },
    { value: "new",  label: m.conditionNew() },
    { value: "used", label: m.conditionUsed() },
  ];

  const sortOptions = [
    { value: "default",    label: m.sortDefault() },
    { value: "price_asc",  label: "↑ " + m.sortPriceLow() },
    { value: "price_desc", label: "↓ " + m.sortPriceHigh() },
  ];

  return (
    <div className="relative z-20 flex items-center justify-between gap-2 mb-2.5 px-0.5">
      <div className="min-w-0">
        <SegmentedControl
          variant="underline"
          value={condition}
          onChange={setCondition}
          options={conditionOptions}
        />
      </div>
      <div className="inline-flex items-center gap-2 shrink-0">
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-ember-600)] hover:text-[var(--color-ember-700)] whitespace-nowrap"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        )}
        <SelectMenu
          value={sort}
          options={sortOptions}
          onChange={setSort}
          leadingIcon={<SortIcon />}
          align="end"
          variant="ghost"
          title={m.sortBy().replace(":", "")}
        />
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
  search: "", category: "all", condition: "all", sort: "default", city: "all",
};

export default function HomePage() {
  const { sellerId, ready } = useGlobalSellerSession();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const { search, category, condition, sort, city } = filters;
  const updateFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const sentinelRef = useRef(null);

  // Play entrance animations only on the first home view of the session — but
  // NOT during SSR / first hydration (the static HTML has no animation classes,
  // so adding them in the initial render would hydration-mismatch). Start false
  // to match the server, then trigger the animation once after mount.
  const [animateEntrance, setAnimateEntrance] = useState(false);
  useEffect(() => {
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
  const featuredProducts = liveFeatured ?? cachedFeatured ?? [];

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

  const matchesFilters = (p, { skipFeaturedDedup = false, skipCategory = false } = {}) => {
    if (!skipFeaturedDedup && featuredIds.has(p._id)) return false;
    const q = search.toLowerCase();
    const catStrings  = getCategorySearchStrings(p.category);
    const matchSearch = !q || p.title.toLowerCase().includes(q) || catStrings.some((s) => s.includes(q));
    const matchCond   = condition === "all" || p.condition === condition;
    const matchCity   = city === "all" || p.city === city;
    const matchCat    = skipCategory ? true : (category === "all" || p.category === category);
    return matchSearch && matchCond && matchCity && matchCat;
  };

  const applySort = (list) => {
    if (sort === "price_asc")  return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  };

  const regular  = useMemo(() => applySort(results.filter((p) => matchesFilters(p, { skipCategory: true }))),
    [results, search, condition, sort, city, featuredIds]);
  const featured = useMemo(() => applySort(featuredProducts.filter((p) => matchesFilters(p, { skipFeaturedDedup: true }))),
    [featuredProducts, search, condition, sort, category, city]);
  const totalCount = featured.length + regular.length;

  const isLoading =
    status === "LoadingFirstPage" &&
    featuredProducts.length === 0 &&
    !(cachedResults && cachedResults.length > 0);

  return (
    <div className="pb-6">
      <SearchRow
        search={search}
        setSearch={updateFilter("search")}
        city={city}
        setCity={updateFilter("city")}
        availableCities={availableCities}
        animate={animateEntrance}
      />

      <div className={`mb-3 ${animateEntrance ? "fade-up" : ""}`}>
        <CategoryBar selected={category} onSelect={updateFilter("category")} />
      </div>

      {!isLoading && (
        <MetaRow
          condition={condition}
          setCondition={updateFilter("condition")}
          sort={sort}
          setSort={updateFilter("sort")}
          hasActiveFilter={
            condition !== "all" || city !== "all" || sort !== "default" || category !== "all" || search !== ""
          }
          onReset={() => setFilters(INITIAL_FILTERS)}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton.ProductCard key={i} />)}
        </div>
      )}

      {!isLoading && totalCount === 0 && <EmptyState />}

      {totalCount > 0 && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 ${animateEntrance ? "stagger" : ""}`}>
          {featured.map((p) => <ProductCard key={p._id} product={p} onSave={onSave} />)}
          {regular.map((p)  => <ProductCard key={p._id} product={p} onSave={onSave} />)}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {status === "LoadingMore" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.ProductCard key={i} />)}
        </div>
      )}

      {status === "Exhausted" && results.length > DEFAULT_PAGE_SIZE && (
        <EndDivider label="End" />
      )}

      {ready && sellerId && totalCount > 0 && (
        <Link
          to="/seller/add"
          className="fixed end-3 sm:end-6 bottom-24 sm:bottom-6 z-30 w-14 h-14 rounded-full bg-[#ed0040] hover:bg-[#c80037] text-white shadow-[0_14px_30px_-12px_rgba(237,0,64,0.55)] inline-flex items-center justify-center ring-4 ring-[var(--color-cream)] transition-transform active:scale-95 hover:scale-105"
          aria-label="Sell now"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}
