"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSellerSession } from "@/lib/useSellerSession";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const EDITABLE_STATUSES = ["pending", "approved", "rejected"];

const STATUS_STYLE = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  sold:     "bg-blue-100 text-blue-700",
  paid:     "bg-purple-100 text-purple-700",
};

// ── Stat card ──────────────────────────────────────────────
function StatsPanel({ stats, t }) {
  return (
    <div className="space-y-3 mb-6">

      {/* ── Featured: the two most actionable metrics ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Approved — live listings */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-[11px] font-semibold text-green-100 uppercase tracking-widest mb-1">{t.statApproved}</p>
          <p className="text-4xl font-bold text-white leading-none">{stats.approved}</p>
          <p className="text-[11px] text-green-100 mt-2">Live listings</p>
        </div>

        {/* Pending — awaiting review */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-widest mb-1">{t.statPending}</p>
          <p className="text-4xl font-bold text-white leading-none">{stats.pending}</p>
          <p className="text-[11px] text-amber-100 mt-2">Awaiting review</p>
        </div>
      </div>

      {/* ── Secondary metrics strip ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex divide-x divide-gray-100 overflow-hidden">
        {[
          { label: t.statTotal, value: stats.total,    color: "text-gray-800"   },
          { label: t.statSold,  value: stats.sold,     color: "text-blue-600"   },
          { label: t.statPaid,  value: stats.paid,     color: "text-purple-600" },
        ].map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-4 gap-0.5">
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            <span className="text-[11px] text-gray-400 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kebab menu ─────────────────────────────────────────────
function ProductMenu({ product, t, onEdit, onRepost, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirmDel(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canEdit   = EDITABLE_STATUSES.includes(product.status);
  const canDelete = ["pending","rejected"].includes(product.status);

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => { setOpen(v => !v); setConfirmDel(false); }}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[130px]">
          {confirmDel ? (
            <div className="p-3">
              <p className="text-xs text-red-600 font-medium mb-2">{t.sellerDeleteConfirm}</p>
              <div className="flex gap-2">
                <button onClick={() => { onDelete(); setOpen(false); setConfirmDel(false); }}
                  className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 rounded-lg transition-colors">{t.adminDelete}</button>
                <button onClick={() => setConfirmDel(false)}
                  className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded-lg transition-colors">{t.adminCancel}</button>
              </div>
            </div>
          ) : (
            <>
              {canEdit && (
                <button onClick={() => { onEdit(); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-start">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  {t.editBtn}
                </button>
              )}
              <button onClick={() => { onRepost(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-start">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {t.repostBtn}
              </button>
              {canDelete && (
                <>
                  <div className="border-t border-gray-100 mx-2"/>
                  <button onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-start">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    {t.adminDelete}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function SellerDashboard() {
  const { t } = useT();
  const router = useRouter();
  const { seller, loading } = useSellerSession();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const sellerRemove = useMutation(api.products.sellerRemove);

  const products    = useQuery(api.products.getBySeller, seller ? { sellerId: seller._id } : "skip");
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
        <div className="h-28 bg-gray-200 rounded-2xl"/>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({length:5}).map((_,i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl"/>)}
        </div>
        <div className="h-48 bg-gray-200 rounded-2xl"/>
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
    await sellerRemove({ id: product._id, sellerId: seller._id });
  }

  async function handleRepost(product) {
    router.push(`/seller/repost/${product._id}`);
  }

  const statusLabel = { pending: t.statusPending, approved: t.statusApproved, rejected: t.statusRejected, sold: t.statusSold, paid: t.statusPaid };

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
                  ? "No service fee on all your listings this period"
                  : `Fixed fee of ${activeOffer.flatFeeAmount?.toLocaleString()} IQD for any price range`}
              </p>
              <p className="text-[10px] text-rose-200 mt-1">
                Valid: <span className="font-bold text-white">{activeOffer.startDate} → {activeOffer.endDate}</span>
              </p>
            </div>
          </div>
        </div>
      )}


      <StatsPanel stats={stats} t={t} />

      {/* ── My Products — sticky below header ──────────── */}
      <div className="sticky top-14 z-10 -mx-4 px-4 bg-gray-50 pb-2 shadow-[0_4px_8px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between pt-3 mb-3">
          <h2 className="text-base font-bold text-gray-800">{t.sellerMyProducts}</h2>
          <span className="text-xs text-gray-400">{products.length} {t.statTotal.toLowerCase()}</span>
        </div>

        {/* Category filter */}
        {sellerCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["all", ...sellerCategories].map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  categoryFilter === cat ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
                }`}>{cat === "all" ? t.categoryAll : cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Empty */}
      {products.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
          </svg>
          <p className="text-gray-400 font-medium text-sm">{t.noSellerProducts}</p>
          <Link href="/seller/add" className="mt-3 text-xs font-semibold text-rose-500 hover:underline">{t.addFirstProduct} →</Link>
        </div>
      )}

      {products.length > 0 && visibleProducts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">{t.noProducts}</p>
      )}

      {/* Product list */}
      {visibleProducts.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleProducts.map((product) => (
            <div key={product._id} className={`bg-white rounded-xl border p-3.5 hover:shadow-sm transition-all ${
              product.status === "rejected" ? "border-red-100" : "border-gray-100 hover:border-rose-100"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {product.photos?.[0]
                    ? <img src={product.photos[0]} alt={product.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{product.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <span className="text-xs text-gray-400 truncate min-w-0">{product.category}</span>
                    {product.seq && <span className="text-xs font-mono text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">{product.seq}</span>}
                  </div>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">{formatPrice(product.price)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${STATUS_STYLE[product.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {statusLabel[product.status] ?? product.status}
                </span>
                <ProductMenu product={product} t={t}
                  onEdit={() => router.push(`/seller/products/${product._id}/edit`)}
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
    </div>
  );
}
