"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { formatPrice } from "@/lib/utils";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

const STATUS_STYLE = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  sold:     "bg-blue-100 text-blue-700",
  paid:     "bg-purple-100 text-purple-700",
};

const TABS = ["all","pending","approved","rejected","sold","paid"];

export default function AdminProductsPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const products       = useQuery(api.products.getAll);
  const updateStatus   = useMutation(api.products.updateStatus);
  const removeProduct  = useMutation(api.products.remove);
  const createNotif    = useMutation(api.notifications.create);

  const [tab,          setTab]          = useState(searchParams.get("tab") ?? "pending");
  const [search,       setSearch]       = useState("");
  const [rejectingId,  setRejectingId]  = useState(focusId ?? null);
  const [rejectReason, setRejectReason] = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);

  const statusLabels = {
    all:      t.adminAllStatus,
    pending:  t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    sold:     t.statusSold,
    paid:     t.statusPaid,
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    const list = tab === "all" ? products : products.filter((p) => p.status === tab);
    const q = search.trim().toLowerCase();
    const searched = q
      ? list.filter((p) =>
          p.title.toLowerCase().includes(q) ||
          (p.seq ?? "").toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        )
      : list;
    return [...searched].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }, [products, tab, search]);

  const counts = useMemo(() => {
    if (!products) return {};
    return Object.fromEntries(
      TABS.map((s) => [s, s === "all" ? products.length : products.filter((p) => p.status === s).length])
    );
  }, [products]);

  async function approve(product) {
    await updateStatus({
      id: product._id,
      status: "approved",
      approvedBy: "admin",
      approvedAt: new Date().toISOString(),
    });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminApproveMsg(product.title) });
  }

  async function reject(product) {
    if (!rejectReason.trim()) return;
    await updateStatus({ id: product._id, status: "rejected", notes: rejectReason.trim() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminRejectMsg(product.title, rejectReason.trim()) });
    setRejectingId(null);
    setRejectReason("");
  }

  async function markSold(product) {
    await updateStatus({ id: product._id, status: "sold", dateSold: new Date().toISOString() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminSoldMsg(product.title) });
  }

  async function markPaid(product) {
    await updateStatus({ id: product._id, status: "paid" });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminPaidMsg(product.title) });
  }

  async function deleteProduct(id) {
    await removeProduct({ id });
    setConfirmDel(null);
  }

  if (!products) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">{t.adminProducts}</h1>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, code (DS-0001), seller name…"
          dir="ltr"
          className="w-full border border-gray-200 rounded-xl ps-10 pe-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === s ? "bg-rose-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-rose-300"
            }`}
          >
            {statusLabels[s]}
            {counts[s] > 0 && (
              <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${tab === s ? "bg-white/20" : "bg-gray-100"}`}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          <p className="text-sm font-medium">{t.adminNoProducts}</p>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-3">
        {filtered.map((product) => (
          <div key={product._id} className={`bg-white rounded-xl border transition-colors ${
            rejectingId === product._id ? "border-red-200" : "border-gray-100 hover:border-rose-100"
          }`}>
            {/* Main row */}
            <div className="p-4 flex items-start gap-4">
              {/* Photo */}
              <div
                className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer"
                onClick={() => setExpanded(expanded === product._id ? null : product._id)}
              >
                {product.photos?.[0]
                  ? <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-200" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800 truncate">{product.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[product.status]}`}>
                    {statusLabels[product.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {product.category} · {product.condition === "new" ? t.conditionNew : t.conditionUsed}
                  {product.seq && <span className="ms-2 font-mono font-bold text-rose-400">{product.seq}</span>}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">{formatPrice(product.price)}</span>
                  <span className="text-xs text-rose-500 font-medium">{t.adminProfitLabel}: {formatPrice(product.profit)}</span>
                  <span className="text-xs text-gray-400">{product.dateAdded?.slice(0,10)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-600 font-medium">{product.sellerName}</span>
                  {product.sellerPhone && (
                    <a
                      href={`https://wa.me/${product.sellerPhone.replace(/\D/g,"")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                    >
                      {t.adminContact} {product.sellerPhone}
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                {product.status === "pending" && (
                  <>
                    <button onClick={() => approve(product)}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      {t.adminApprove}
                    </button>
                    <button onClick={() => { setRejectingId(product._id); setRejectReason(""); }}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-red-100">
                      {t.adminReject}
                    </button>
                  </>
                )}
                {product.status === "approved" && (
                  <button onClick={() => markSold(product)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
                    {t.adminMarkSold}
                  </button>
                )}
                {product.status === "sold" && (
                  <button onClick={() => markPaid(product)}
                    className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-purple-100">
                    {t.adminMarkPaid}
                  </button>
                )}
                {product.status === "rejected" && (
                  <button onClick={() => approve(product)}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-green-100">
                    {t.adminApprove}
                  </button>
                )}
                {confirmDel === product._id ? (
                  <div className="flex gap-1">
                    <button onClick={() => deleteProduct(product._id)}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-2 py-1.5 rounded-lg transition-colors">✓</button>
                    <button onClick={() => setConfirmDel(null)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-lg transition-colors">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(product._id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    {t.adminDelete}
                  </button>
                )}
              </div>
            </div>

            {/* Rejection reason input */}
            {rejectingId === product._id && (
              <div className="border-t border-red-100 px-4 py-3 bg-red-50 rounded-b-xl">
                <p className="text-xs font-medium text-red-600 mb-2">{t.adminRejectReason}</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t.adminRejectPlaceholder}
                  rows={2}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={() => reject(product)} disabled={!rejectReason.trim()}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {t.adminRejectSubmit}
                  </button>
                  <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="text-xs bg-white text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                    {t.adminCancel}
                  </button>
                </div>
              </div>
            )}

            {/* Expanded photos + description */}
            {expanded === product._id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 rounded-b-xl">
                {product.photos?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {product.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                )}
                {product.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
                )}
                {product.notes && (
                  <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-2">{product.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
