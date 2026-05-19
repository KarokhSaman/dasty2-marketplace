"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useRef, useEffect } from "react";
import ProductCard from "@/components/buyer/ProductCard";
import CategoryBar from "@/components/buyer/CategoryBar";
import { useT } from "@/lib/i18n/LocaleProvider";

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


const HOME_STATE_KEY  = "dasty2-home-state";
const HOME_SCROLL_KEY = "dasty2-home-scroll";

export default function HomePage() {
  const { t } = useT();
  const products = useQuery(api.products.getPublic);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("all");
  const [condition, setCondition] = useState("all");
  const [sort, setSort]           = useState("default");

  // Restore filters immediately on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(HOME_STATE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(HOME_STATE_KEY);
    const { search: s, category: c, condition: co, sort: so, scrollY } = JSON.parse(raw);
    if (s  !== undefined) setSearch(s);
    if (c  !== undefined) setCategory(c);
    if (co !== undefined) setCondition(co);
    if (so !== undefined) setSort(so);
    if (scrollY) sessionStorage.setItem(HOME_SCROLL_KEY, scrollY);
  }, []);

  // Restore scroll after products render
  useEffect(() => {
    const y = sessionStorage.getItem(HOME_SCROLL_KEY);
    if (!products || !y) return;
    sessionStorage.removeItem(HOME_SCROLL_KEY);
    requestAnimationFrame(() => window.scrollTo({ top: Number(y), behavior: "instant" }));
  }, [products]);

  function saveState() {
    sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify({
      search, category, condition, sort, scrollY: window.scrollY,
    }));
  }

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCat  = category === "all" || p.category === category;
      const matchCond = condition === "all" || p.condition === condition;
      return matchSearch && matchCat && matchCond;
    });
  }, [products, search, category, condition]);

  const { featured, regular } = useMemo(() => {
    if (sort === "price_asc") {
      const sorted = [...filtered].sort((a, b) => a.price - b.price);
      return { featured: [], regular: sorted };
    }
    if (sort === "price_desc") {
      const sorted = [...filtered].sort((a, b) => b.price - a.price);
      return { featured: [], regular: sorted };
    }
    return {
      featured: filtered.filter((p) => p.featured),
      regular:  filtered.filter((p) => !p.featured),
    };
  }, [filtered, sort]);

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 shadow-sm"
        />
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

      {/* Sort + result count row */}
      {products !== undefined && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400">{t.productsFound(filtered.length)}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">{t.sortBy}</span>
            <SortDropdown sort={sort} setSort={setSort} t={t} />
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {products === undefined && (
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
      {products !== undefined && filtered.length === 0 && (
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
    </div>
  );
}
