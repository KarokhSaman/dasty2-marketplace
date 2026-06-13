import { usePaginatedQuery } from "convex/react";
import { useQuery as useReactQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import ProductCard from "@/components/buyer/ProductCard";
import CategoryBar from "@/components/buyer/CategoryBar";
import LocationPicker from "@/components/buyer/LocationPicker";
import { SearchInput, SegmentedControl, Skeleton } from "@/components/ui";
import { Link } from "@tanstack/react-router";
import * as m from "@/paraglide/messages";
import { getCategorySearchStrings } from "@/lib/categories";
import { getAllBrands } from "@/lib/brands";
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
    <div className={`relative z-[60] flex items-stretch gap-2 mb-3 ${animate ? "fade-up" : ""}`}>
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center h-7 px-1.5 rounded-full border transition-all duration-200 ${
          isActive
            ? "border-[var(--color-ember-400)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)]"
            : "border-transparent bg-[var(--color-sand)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink)]"
        }`}
        title={currentOption?.label}
      >
        <SortIcon />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-30 overflow-hidden min-w-[190px]">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSort(opt.value);
                setOpen(false);
              }}
              className={`flex items-center justify-between gap-4 w-full px-4 py-2.5 text-sm text-start whitespace-nowrap transition-colors ${
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
      )}
    </div>
  );
}

/** Brand multi-select dropdown component */
function BrandSelector({ brands, setBrands }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const allBrands = getAllBrands();
  const selectedCount = brands.length;
  const label = selectedCount > 0 ? `${m.brandLabel()} (${selectedCount})` : m.allBrands();
  const isActive = selectedCount > 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleBrand = (brand) => {
    if (brands.includes(brand)) {
      setBrands(brands.filter(b => b !== brand));
    } else {
      setBrands([...brands, brand]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 text-[11.5px] font-semibold whitespace-nowrap ${
          isActive
            ? "border-[var(--color-ember-400)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)]"
            : "border-transparent bg-[var(--color-sand)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink)]"
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-30 overflow-hidden min-w-[280px]">
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {allBrands.map((brand) => {
                const isSelected = brands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => toggleBrand(brand)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-all duration-200 ${
                      isSelected
                        ? "bg-[var(--color-ember-600)] text-white shadow-[0_2px_4px_rgba(237,0,64,0.2)]"
                        : "bg-[var(--color-cream)] text-[var(--color-ink)] border border-[var(--color-hairline)] hover:bg-[var(--color-sand)]"
                    }`}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Single row: condition tabs (left) + filters (right). Count lives in FloatingCount. */
function MetaRow({ condition, setCondition, sort, setSort, brands, setBrands, hasActiveFilter, onReset }) {
  const conditionOptions = [
    { value: "all",  label: m.allItems() },
    { value: "new",  label: m.conditionNew() },
    { value: "used", label: m.conditionUsed() },
  ];

  return (
    <div className="relative z-50">
      <div className="flex items-center justify-between gap-1.5 mb-2.5 px-0.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SegmentedControl
            variant="underline"
            value={condition}
            onChange={setCondition}
            options={conditionOptions}
          />
          {hasActiveFilter && (() => {
            const isEnglish = typeof document !== "undefined" && document.documentElement.lang === "en";
            if (isEnglish) {
              return (
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
              );
            } else {
              return (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-lg border border-[var(--color-ember-300)] bg-[var(--color-ember-50)] text-[var(--color-ember-600)] hover:bg-[var(--color-ember-100)] hover:border-[var(--color-ember-400)] font-semibold text-[9px] whitespace-nowrap shrink-0 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">{m.filterReset()}</span>
                </button>
              );
            }
          })()}
        </div>
        <div className="inline-flex items-center gap-1 shrink-0">
          <BrandSelector brands={brands} setBrands={setBrands} />
          <SortMenu sort={sort} setSort={setSort} />
        </div>
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
  search: "", category: "all", condition: "all", sort: "default", city: "all", brands: [],
};

export default function HomePage() {
  const { sellerId, ready } = useGlobalSellerSession();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [rotationTick, setRotationTick] = useState(0); // Trigger refetch every 25s
  const { search, category, condition, sort, city, brands } = filters;
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
  // Only enable real-time rotation when category is "all"
  const queryClient = useQueryClient();
  const { data: liveFeatured } = useReactQuery(convexQuery(api.products.getFeatured, {}));
  const featuredProducts = liveFeatured ?? cachedFeatured ?? [];

  // Update rotationTick every 25 seconds, but only refetch when category is "all"
  useEffect(() => {
    if (category !== "all") return; // Skip rotation for other categories

    const interval = setInterval(() => {
      setRotationTick(t => t + 1);
    }, 25000); // 25 seconds
    return () => clearInterval(interval);
  }, [category]);

  // When rotationTick changes and category is "all", invalidate queries to refetch
  useEffect(() => {
    if (rotationTick > 0 && category === "all") {
      // Invalidate all queries to force refetch with new rotation
      queryClient?.invalidateQueries();
    }
  }, [rotationTick, category, queryClient]);

  // Pinned products for the top carousel - only fetch when category is "all"
  const { data: livePinned } = useReactQuery(convexQuery(api.products.getPinned, {}));
  const pinnedProducts = category === "all" ? (livePinned ?? []) : [];

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
    const q = search.toLowerCase();
    const catStrings  = getCategorySearchStrings(p.category);
    const matchSearch = !q || p.title.toLowerCase().includes(q) || catStrings.some((s) => s.includes(q));
    const matchCond   = condition === "all" || p.condition === condition;
    const matchCity   = city === "all" || p.city === city;
    const matchCat    = skipCategory ? true : (category === "all" || p.category === category);
    const matchBrand  = brands.length === 0 || (p.brand && brands.includes(p.brand));
    return matchSearch && matchCond && matchCity && matchCat && matchBrand;
  };

  const applySort = (list) => {
    if (sort === "price_asc")  return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") return [...list].sort((a, b) => b.price - a.price);
    // Default: sort by publication date (newest first)
    return [...list].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  };

  // Featured products for carousel — preserve position-based order from getFeatured query
  const featuredFiltered = useMemo(() => featuredProducts.filter((p) => matchesFilters(p, { skipCategory: true })),
    [featuredProducts, search, condition, city, brands]);

  // All products: featured products on top (position-based order), then regular products
  const allProducts = useMemo(() => {
    const featured = featuredProducts.filter((p) => matchesFilters(p, { skipCategory: true }));
    const featuredIds = new Set(featured.map(p => p._id));
    const regular = results.filter((p) => matchesFilters(p, { skipCategory: true }) && !featuredIds.has(p._id));
    // Featured products preserve position-based order from getFeatured query, then regular products
    const sortedFeatured = featured; // Already sorted by position in getFeatured query
    const combined = [...sortedFeatured, ...applySort(regular)];
    return combined;
  }, [featuredProducts, results, search, condition, sort, city, brands]);
  const totalCount = allProducts.length;

  // Hover state for carousel and ref for auto-scroll
  const [isHovering, setIsHovering] = useState(false);
  const carouselRef = useRef(null);

  // Auto-scroll carousel every 3 seconds with infinite circular motion
  useEffect(() => {
    if (!carouselRef.current || isHovering || featuredFiltered.length === 0) return;

    const element = carouselRef.current;
    const scrollAmount = 150; // Scroll by card width + gap
    const isRTL = document.documentElement.dir === "rtl";
    let lastScrollWidth = 0;

    const interval = setInterval(() => {
      if (element) {
        // Recalculate scrollWidth each interval to account for images loading
        const currentScrollWidth = element.scrollWidth;

        // Only use the width if it's stable (hasn't changed recently, meaning images are loaded)
        if (currentScrollWidth > 0 && currentScrollWidth !== lastScrollWidth) {
          lastScrollWidth = currentScrollWidth;
          return; // Skip this scroll, wait for next interval when width stabilizes
        }

        lastScrollWidth = currentScrollWidth;
        const oneSetWidth = currentScrollWidth / 2;

        // Get current scroll position
        const currentScroll = Math.abs(element.scrollLeft);

        // Reset to beginning if we've scrolled past halfway point
        if (currentScroll >= oneSetWidth - scrollAmount) {
          element.scrollLeft = 0;
        } else {
          // Auto-scroll - direction depends on text direction
          const scrollValue = isRTL ? -scrollAmount : scrollAmount;
          element.scrollBy({
            left: scrollValue,
            behavior: "smooth",
          });
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovering, featuredFiltered.length]);

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

      <div className={`mb-1 ${animateEntrance ? "fade-up" : ""}`}>
        <CategoryBar selected={category} onSelect={updateFilter("category")} />
      </div>

      {!isLoading && (
        <MetaRow
          condition={condition}
          setCondition={updateFilter("condition")}
          sort={sort}
          setSort={updateFilter("sort")}
          brands={brands}
          setBrands={updateFilter("brands")}
          hasActiveFilter={
            condition !== "all" || city !== "all" || sort !== "default" || category !== "all" || search !== "" || brands.length > 0
          }
          onReset={() => setFilters(INITIAL_FILTERS)}
        />
      )}

      {/* Featured Products Carousel - Sticky with Circular Cards (hidden on mobile) */}
      {featuredFiltered.length > 0 && category === "all" && (
        <div className={`hidden sm:block sticky top-14 z-30 bg-white pt-1 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 ${animateEntrance ? "fade-up" : ""}`}>
          <h2 className="text-sm font-bold text-[var(--color-ink)] mb-3 px-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-[var(--color-ember-500)] text-white shadow-[0_2px_6px_-2px_rgba(237,0,64,0.6)]">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.39 6.96H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.55L2 8.96h7.61L12 2z" />
              </svg>
            </span>
            VIP
          </h2>
          <div
            ref={carouselRef}
            className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex gap-4 sm:gap-5">
              {/* Original products */}
              {featuredFiltered.map((p) => (
                <Link
                  key={`${p._id}-1`}
                  to={`/products/${p._id}`}
                  className="shrink-0"
                >
                  <div className="group cursor-pointer text-center">
                    <div className="relative w-20 h-16 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-100 mb-2 mx-auto">
                      {p.photos?.[0] ? (
                        <img
                          src={p.photos[0]}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-[var(--color-ink-fade)] font-medium mb-0.5">{p.category}</p>
                    <p className="text-xs sm:text-sm font-bold text-[var(--color-ember-600)]">
                      {(p.price ?? 0).toLocaleString()} IQD
                    </p>
                  </div>
                </Link>
              ))}
              {/* Cloned products for infinite loop */}
              {featuredFiltered.map((p) => (
                <Link
                  key={`${p._id}-2`}
                  to={`/products/${p._id}`}
                  className="shrink-0"
                >
                  <div className="group cursor-pointer text-center">
                    <div className="relative w-20 h-16 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-100 mb-2 mx-auto">
                      {p.photos?.[0] ? (
                        <img
                          src={p.photos[0]}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-[var(--color-ink-fade)] font-medium mb-0.5">{p.category}</p>
                    <p className="text-xs sm:text-sm font-bold text-[var(--color-ember-600)]">
                      {(p.price ?? 0).toLocaleString()} IQD
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visual separator (hidden on mobile) */}
      {featuredFiltered.length > 0 && (
        <div className="hidden sm:flex sticky sm:top-[220px] md:top-[270px] lg:top-[265px] z-40 bg-white items-center gap-3 my-0 py-2">
          <div className="flex-1 h-px bg-[var(--color-hairline)]" />
          <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide">All Products</p>
          <div className="flex-1 h-px bg-[var(--color-hairline)]" />
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton.ProductCard key={i} />)}
        </div>
      )}

      {!isLoading && allProducts.length === 0 && featuredFiltered.length === 0 && <EmptyState />}

      {allProducts.length > 0 && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-1 ${animateEntrance ? "stagger" : ""}`}>
          {allProducts.map((p) => (
            <ProductCard key={p._id} product={p} onSave={onSave} />
          ))}
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

    </div>
  );
}
