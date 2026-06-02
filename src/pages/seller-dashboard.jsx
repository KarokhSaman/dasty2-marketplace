import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useParams, useLocation, useSearch } from "@tanstack/react-router";
const usePathname = () => useLocation({ select: (l) => l.pathname });
const useSearchParams = () => {
  const s = useSearch({ strict: false }) || {};
  return {
    get: (k) => (s[k] ?? null),
    getAll: (k) => (Array.isArray(s[k]) ? s[k] : s[k] != null ? [s[k]] : []),
  };
};
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useSellerSession } from "@/lib/useSellerSession";
import { calculateProfit, formatPrice } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { BottomSheet, useIsDesktop } from "@/components/ui";
import { getCategoryLabel } from "@/lib/categories";
import { Link } from "@tanstack/react-router";

const EDITABLE_STATUSES = ["pending", "approved", "rejected"];

const STATUS_STYLE = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  sold:     "bg-blue-100 text-blue-700",
  paid:     "bg-purple-100 text-purple-700",
};

// ── Stat card ──────────────────────────────────────────────
function StatsPanel({ stats }) {
  return (
    <div className="space-y-3 mb-6">

      {/* ── Featured: the two most actionable metrics ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Approved — live listings */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-[11px] font-semibold text-green-100 uppercase tracking-widest mb-1">{m.statApproved()}</p>
          <p className="text-4xl font-bold text-white leading-none">{stats.approved}</p>
          <p className="text-[11px] text-green-100 mt-2">{m.statLiveListings()}</p>
        </div>

        {/* Pending — awaiting review */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-widest mb-1">{m.statPending()}</p>
          <p className="text-4xl font-bold text-white leading-none">{stats.pending}</p>
          <p className="text-[11px] text-amber-100 mt-2">{m.statAwaitingReview()}</p>
        </div>
      </div>

      {/* ── Secondary metrics strip ── */}
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm flex divide-x divide-[var(--color-hairline)] overflow-hidden">
        {[
          { label: m.statTotal(), value: stats.total,    color: "text-[var(--color-ink)]"   },
          { label: m.statSold(),  value: stats.sold,     color: "text-blue-600"   },
          { label: m.statPaid(),  value: stats.paid,     color: "text-purple-600" },
        ].map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-4 gap-0.5">
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            <span className="text-[11px] text-[var(--color-ink-fade)] font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Per-product actions — dropdown on desktop, action sheet on mobile ──
function ProductMenu({ product, onEdit, onRepost, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const isDesktop = useIsDesktop();
  const ref = useRef();

  useEffect(() => {
    if (!open || !isDesktop) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirmDel(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isDesktop]);

  const close = () => { setOpen(false); setConfirmDel(false); };
  const canEdit   = EDITABLE_STATUSES.includes(product.status);
  const canDelete = ["pending","rejected"].includes(product.status);

  const rowCls = "flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-[15px] sm:text-sm text-start transition-colors";

  const actions = confirmDel ? (
    <div className="p-4 sm:p-3">
      <p className="text-[13px] text-red-600 font-medium mb-3">{m.sellerDeleteConfirm()}</p>
      <div className="flex gap-2">
        <button onClick={() => { onDelete(); close(); }}
          className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors">{m.adminDelete()}</button>
        <button onClick={() => setConfirmDel(false)}
          className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">{m.adminCancel()}</button>
      </div>
    </div>
  ) : (
    <div className="py-1">
      {canEdit && (
        <button onClick={() => { onEdit(); close(); }} className={`${rowCls} text-[var(--color-ink)] hover:bg-[var(--color-cream)]`}>
          <svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          {m.editBtn()}
        </button>
      )}
      <button onClick={() => { onRepost(); close(); }} className={`${rowCls} text-[var(--color-ink)] hover:bg-[var(--color-cream)]`}>
        <svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        {m.repostBtn()}
      </button>
      {canDelete && (
        <>
          <div className="border-t border-[var(--color-hairline)] mx-2 my-1"/>
          <button onClick={() => setConfirmDel(true)} className={`${rowCls} text-red-500 hover:bg-red-50`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            {m.adminDelete()}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => { setOpen(v => !v); setConfirmDel(false); }} aria-label="Actions"
        className="p-1.5 text-[var(--color-ink-fade)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)] rounded-lg transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {/* Desktop: anchored dropdown */}
      {open && isDesktop && (
        <div className="absolute end-0 top-full mt-1 bg-white border border-[var(--color-hairline)] rounded-xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-20 overflow-hidden min-w-[150px]">
          {actions}
        </div>
      )}

      {/* Mobile: action sheet */}
      {!isDesktop && (
        <BottomSheet open={open} onClose={close} title={product.title}>
          {actions}
        </BottomSheet>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function SellerDashboard() {
  const locale = getLocale();
  const router = useRouter();
  const { seller, loading } = useSellerSession();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const sellerRemove = useMutation(api.products.sellerRemove);

  const products    = useQuery(api.products.getBySeller, seller ? {} : "skip");
  const activeOffer = useQuery(api.offers.getActive);

  const sellerCategories = useMemo(() => {
    if (!products) return [];
    const seen = new Set();
    return products.filter((p) => { if (seen.has(p.category)) return false; seen.add(p.category); return true; }).map(p => p.category);
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const sorted = [...products].reverse();
    return categoryFilter === "all" ? sorted : sorted.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  if (loading || !seller || products === undefined) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-28 bg-[var(--color-cream-deep)] rounded-2xl"/>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({length:5}).map((_,i) => <div key={i} className="h-20 bg-[var(--color-cream-deep)] rounded-2xl"/>)}
        </div>
        <div className="h-48 bg-[var(--color-cream-deep)] rounded-2xl"/>
      </div>
    );
  }

  if (!seller) return null;

  const stats = {
    total:    products.length,
    pending:  products.filter(p => p.status === "pending").length,
    approved: products.filter(p => p.status === "approved").length,
    sold:     products.filter(p => p.status === "sold").length,
    paid:     products.filter(p => p.status === "paid").length,
  };

  async function handleDelete(product) {
    await sellerRemove({ id: product._id });
  }

  async function handleRepost(product) {
    router.navigate({ to: `/seller/repost/${product._id}` });
  }

  const statusLabel = { pending: m.statusPending(), approved: m.statusApproved(), rejected: m.statusRejected(), sold: m.statusSold(), paid: m.statusPaid() };

  return (
    <div className="relative">

      {/* ── Active offer banner ── */}
      {activeOffer && (
        <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-rose-400 rounded-2xl p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 pointer-events-none"/>
          <div className="absolute bottom-0 start-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-4 pointer-events-none"/>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">🎉</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{activeOffer.title}</p>
              {activeOffer.description && (
                <p className="text-xs text-rose-100 mt-0.5">{activeOffer.description}</p>
              )}
              <p className="text-xs text-rose-100 mt-1.5 font-medium">
                {activeOffer.type === "free"
                  ? m.offerNoFeeNote()
                  : m.offerFlatFeeNote({ amount: activeOffer.flatFeeAmount?.toLocaleString() })}
              </p>
              <p className="text-[10px] text-rose-200 mt-1">
                Valid: <span className="font-bold text-white">{activeOffer.startDate} → {activeOffer.endDate}</span>
              </p>
            </div>
          </div>
        </div>
      )}


      <StatsPanel stats={stats} />

      {/* ── My Products — sticky below header ──────────── */}
      <div className="sticky top-14 z-10 -mx-4 px-4 bg-[var(--color-cream)] pb-2 shadow-[0_4px_8px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between pt-3 mb-3">
          <h2 className="text-base font-bold text-[var(--color-ink)]">{m.sellerMyProducts()}</h2>
          <span className="text-xs text-[var(--color-ink-fade)]">{products.length} {m.statTotal().toLowerCase()}</span>
        </div>

        {/* Category filter */}
        {sellerCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["all", ...sellerCategories].map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  categoryFilter === cat ? "bg-rose-600 text-white border-rose-600" : "bg-white text-[var(--color-ink-soft)] border-[var(--color-hairline)] hover:border-rose-300"
                }`}>{cat === "all" ? m.categoryAll() : getCategoryLabel(cat, locale)}</button>
            ))}
          </div>
        )}
      </div>

      {/* Empty */}
      {products.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-[var(--color-hairline)]">
          <svg className="w-12 h-12 text-[var(--color-ink-fade)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
          </svg>
          <p className="text-[var(--color-ink-fade)] font-medium text-sm">{m.noSellerProducts()}</p>
          <Link to="/seller/add" className="mt-3 text-xs font-semibold text-rose-500 hover:underline">{m.addFirstProduct()} →</Link>
        </div>
      )}

      {products.length > 0 && visibleProducts.length === 0 && (
        <p className="text-sm text-[var(--color-ink-fade)] text-center py-10">{m.noProducts()}</p>
      )}

      {/* Product list */}
      {visibleProducts.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleProducts.map((product) => (
            <div key={product._id} className={`bg-white rounded-2xl border p-3.5 hover:shadow-[0_10px_30px_-22px_rgba(11,12,15,0.25)] transition-all ${
              product.status === "rejected" ? "border-red-100" : "border-[var(--color-hairline)] hover:border-[var(--color-ember-200)]"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--color-sand)] shrink-0">
                  {product.photos?.[0]
                    ? <img src={product.photos[0]} alt={product.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{product.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <span className="text-xs text-[var(--color-ink-fade)] truncate min-w-0">{getCategoryLabel(product.category, locale)}</span>
                    {product.seq && <span className="text-xs font-mono text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">{product.seq}</span>}
                  </div>
                  <p className="text-[13px] font-bold text-[var(--color-ink)] mt-0.5">{formatPrice(product.price)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${STATUS_STYLE[product.status] ?? "bg-[var(--color-cream-deep)] text-[var(--color-ink-soft)]"}`}>
                  {statusLabel[product.status] ?? product.status}
                </span>
                <ProductMenu product={product}
                  onEdit={() => router.navigate({ to: `/seller/products/${product._id}/edit` })}
                  onRepost={() => handleRepost(product)}
                  onDelete={() => handleDelete(product)}/>
              </div>
              {/* Rejection reason */}
              {product.status === "rejected" && product.notes && (
                <div className="mt-2.5 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <p className="text-xs text-red-600 leading-snug">{product.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating "+" button for sellers */}
      <Link
        to="/seller/add"
        className="lg:hidden fixed end-3 md:end-3 bottom-[100px] md:bottom-[116px] z-30 w-14 h-14 rounded-full bg-[#ed0040] hover:bg-[#c80037] text-white shadow-[0_14px_30px_-12px_rgba(237,0,64,0.55)] inline-flex items-center justify-center ring-4 ring-[var(--color-cream)] transition-transform active:scale-95 hover:scale-105"
        aria-label={m.sellNow()}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
