import { useState, useMemo, useEffect } from "react";
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
import { formatPrice } from "@/lib/utils";
import ProductStatusMenu from "@/components/admin/ProductStatusMenu";
import BottomSheet from "@/components/ui/BottomSheet";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;

const STATUS_STYLE = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  sold:     "bg-blue-100 text-blue-700",
  paid:     "bg-purple-100 text-purple-700",
};

const TABS = ["all","pending","approved","rejected","sold","paid"];

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const products        = useQuery(api.products.getAll);
  const updateStatus    = useMutation(api.products.updateStatus);
  const removeProduct       = useMutation(api.products.remove);
  const adminUpdatePhotos   = useMutation(api.products.adminUpdatePhotos);
  const setFeatured         = useMutation(api.products.setFeatured);
  const cleanupExpired      = useMutation(api.products.cleanupExpiredFeatured);
  const createNotif     = useMutation(api.notifications.create);
  const createLog       = useMutation(api.adminLogs.create);

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? "admin"));
  }, []);

  const [featuredPickerId, setFeaturedPickerId] = useState(null);
  const [featuredPosition, setFeaturedPosition] = useState(null); // Selected position 1-10 or null
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [tab,          setTab]          = useState(searchParams.get("tab") ?? "pending");
  const [search,       setSearch]       = useState("");
  const [rejectingId,  setRejectingId]  = useState(focusId ?? null);
  const [rejectReason, setRejectReason] = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [confirmPhoto, setConfirmPhoto] = useState(null); // "productId:photoIndex"
  const [confirmFeature, setConfirmFeature] = useState(null); // { productId, action: 'feature' | 'unfeature', duration }
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");

  const statusLabels = {
    all:      m.adminAllStatus(),
    pending:  m.statusPending(),
    approved: m.statusApproved(),
    rejected: m.statusRejected(),
    sold:     m.statusSold(),
    paid:     m.statusPaid(),
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

  function log(action, product, notes) {
    return createLog({
      action,
      productId:    product?._id?.toString(),
      productTitle: product?.title,
      productCode:  product?.seq,
      sellerName:   product?.sellerName,
      price:        product?.price,
      notes,
    });
  }

  async function approve(product) {
    await updateStatus({ id: product._id, status: "approved", approvedBy: adminEmail, approvedAt: new Date().toISOString() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminApproveMsg({ title: product.title }), url: `/products/${product._id}` });
    await log("approved", product);
  }

  async function reject(product) {
    if (!rejectReason.trim()) return;
    await updateStatus({ id: product._id, status: "rejected", notes: rejectReason.trim() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminRejectMsg({ title: product.title, reason: rejectReason.trim() }), url: `/seller` });
    await log("rejected", product, rejectReason.trim());
    setRejectingId(null);
    setRejectReason("");
  }

  async function markSold(product) {
    await updateStatus({ id: product._id, status: "sold", dateSold: new Date().toISOString() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminSoldMsg({ title: product.title }), url: `/seller` });
    await log("marked_sold", product);
  }

  async function markPaid(product) {
    await updateStatus({ id: product._id, status: "paid" });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminPaidMsg({ title: product.title }), url: `/seller` });
    await log("marked_paid", product);
  }

  async function deleteProduct(id) {
    const product = products?.find(p => p._id === id);
    await removeProduct({ id });
    await log("deleted", product);
    setConfirmDel(null);
  }

  async function handleStatusChange(product, newStatus) {
    switch (newStatus) {
      case "pending":
        await updateStatus({ id: product._id, status: "pending" });
        await log("status_changed_to_pending", product);
        break;
      case "approved":
        await approve(product);
        break;
      case "rejected":
        setRejectingId(product._id);
        setRejectReason("");
        break;
      case "sold":
        await markSold(product);
        break;
      case "paid":
        await markPaid(product);
        break;
    }
  }

  if (!products) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      setCleanupMessage("");
      const result = await cleanupExpired();
      setCleanupMessage(`✓ Unfeatured ${result.unfeatureCount} expired products`);
      setTimeout(() => setCleanupMessage(""), 3000);
    } catch (error) {
      setCleanupMessage(`✗ Error: ${error.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{m.adminProducts()}</h1>
        <button
          onClick={handleCleanup}
          disabled={isCleaningUp}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isCleaningUp ? "Cleaning..." : "Cleanup Expired"}
        </button>
      </div>
      {cleanupMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${cleanupMessage.startsWith("✓") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {cleanupMessage}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-fade)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, code (DS-0001), seller name…"
          dir="ltr"
          className="w-full border border-[var(--color-hairline)] rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-fade)] hover:text-[var(--color-ink-soft)]">
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
              tab === s ? "bg-[var(--color-ember-600)] text-white" : "bg-white text-[var(--color-ink-soft)] border border-[var(--color-hairline)] hover:border-rose-300"
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
        <div className="bg-white rounded-xl border border-[var(--color-hairline)] py-16 text-center text-[var(--color-ink-fade)]">
          <p className="text-sm font-medium">{m.adminNoProducts()}</p>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-3">
        {filtered.map((product) => (
          <div key={product._id} className={`bg-white rounded-xl border transition-colors ${
            rejectingId === product._id ? "border-red-200" : "border-[var(--color-hairline)] hover:border-rose-100"
          }`}>
            {/* Main row */}
            <div className="p-4">
              <div className="flex items-start gap-3">
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
                  </div>
                  {/* Condition + seq */}
                  <p className="text-xs text-[var(--color-ink-fade)] mt-0.5 flex items-center gap-1.5">
                    <span>{product.condition === "new" ? m.conditionNew() : m.conditionUsed()}</span>
                    {product.seq && <span className="font-mono font-bold text-rose-400">{product.seq}</span>}
                  </p>

                  {/* Price + fee + date */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{formatPrice(product.price)}</span>
                    <span className="text-xs text-rose-500 font-medium">{m.adminProfitLabel()}: {formatPrice(product.profit)}</span>
                    <span className="text-xs text-gray-300">{product.dateAdded?.slice(0,10)}</span>
                  </div>

                  {/* Seller + location */}
                  <div className="mt-2 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">{product.sellerName}</span>
                      {product.sellerPhone && (
                        <a
                          href={`https://wa.me/${product.sellerPhone.replace(/\D/g,"")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors"
                        >
                          {m.adminContact()} {product.sellerPhone}
                        </a>
                      )}
                    </div>
                    {(product.city || product.sellerAddress) && (
                      <p className="text-xs text-[var(--color-ink-fade)] flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {product.city}{product.sellerAddress ? `, ${product.sellerAddress}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions — desktop only */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <ProductStatusMenu product={product} onStatusChange={(newStatus) => handleStatusChange(product, newStatus)} />

                  {/* Feature button with popover */}
                  <div className="relative">
                    {product.featured ? (
                      <button
                        onClick={() => setConfirmFeature({ productId: product._id, action: 'unfeature' })}
                        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg font-medium border-2 bg-amber-100 text-amber-700 border-amber-400 hover:bg-amber-200 hover:border-amber-500 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                        {product.featuredPosition ? `Featured — Pos #${product.featuredPosition}` : product.featuredUntil ? `Featured — Until ${product.featuredUntil}` : "Featured"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setFeaturedPickerId(featuredPickerId === product._id ? null : product._id)}
                        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg font-medium border-2 bg-white text-[var(--color-ink-fade)] border-amber-300 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                        Feature
                      </button>
                    )}

                    {/* Duration picker popover */}
                    {featuredPickerId === product._id && (
                      <div className="absolute start-0 top-full mt-1.5 z-30 bg-white border border-[var(--color-hairline)] rounded-xl shadow-lg p-2 min-w-[160px]">
                        <p className="text-[10px] text-[var(--color-ink-fade)] font-semibold uppercase tracking-wide px-1 pb-1.5">Feature for</p>
                        {[
                          { label: "7 days",   days: 7  },
                          { label: "14 days",  days: 14 },
                          { label: "30 days",  days: 30 },
                          { label: "No expiry", days: null },
                        ].map(opt => (
                          <button key={opt.label}
                            onClick={() => {
                              const until = opt.days
                                ? new Date(Date.now() + opt.days * 864e5).toISOString().slice(0, 10)
                                : undefined;
                              setConfirmFeature({ productId: product._id, action: 'feature', duration: opt.label, until });
                              setFeaturedPickerId(null);
                            }}
                            className="w-full text-start px-2 py-1.5 text-xs text-[var(--color-ink)] hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => setConfirmDel(product._id)}
                    className="text-xs font-medium border-2 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg transition-colors">
                    {m.adminDelete()}
                  </button>
                </div>
              </div>

              {/* Actions — mobile only */}
              <div className="flex sm:hidden items-center gap-2 mt-4 flex-wrap">
                <ProductStatusMenu product={product} onStatusChange={(newStatus) => handleStatusChange(product, newStatus)} />

                {/* Feature button with popover */}
                <div className="relative">
                  {product.featured ? (
                    <button
                      onClick={() => setConfirmFeature({ productId: product._id, action: 'unfeature' })}
                      className="flex items-center gap-0.5 text-xs px-1.5 py-1 rounded-lg font-medium border-2 bg-amber-100 text-amber-700 border-amber-400 hover:bg-amber-200 hover:border-amber-500 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                      </svg>
                      <span className="text-[10px]">{product.featuredPosition ? `Pos #${product.featuredPosition}` : product.featuredUntil ? `Until ${product.featuredUntil}` : "Featured"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setFeaturedPickerId(featuredPickerId === product._id ? null : product._id)}
                      className="flex items-center gap-0.5 text-xs px-1.5 py-1 rounded-lg font-medium border-2 bg-white text-[var(--color-ink-fade)] border-amber-300 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-400 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                      </svg>
                      Feature
                    </button>
                  )}

                  {/* Duration picker popover */}
                  {featuredPickerId === product._id && (
                    <div className="absolute start-0 top-full mt-1.5 z-30 bg-white border border-[var(--color-hairline)] rounded-xl shadow-lg p-2 min-w-[160px]">
                      <p className="text-[10px] text-[var(--color-ink-fade)] font-semibold uppercase tracking-wide px-1 pb-1.5">Feature for</p>
                      {[
                        { label: "7 days",   days: 7  },
                        { label: "14 days",  days: 14 },
                        { label: "30 days",  days: 30 },
                        { label: "No expiry", days: null },
                      ].map(opt => (
                        <button key={opt.label}
                          onClick={() => {
                            const until = opt.days
                              ? new Date(Date.now() + opt.days * 864e5).toISOString().slice(0, 10)
                              : undefined;
                            setConfirmFeature({ productId: product._id, action: 'feature', duration: opt.label, until });
                            setFeaturedPickerId(null);
                          }}
                          className="w-full text-start px-2 py-1.5 text-xs text-[var(--color-ink)] hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => setConfirmDel(product._id)}
                  className="text-xs font-medium border-2 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-500 hover:text-red-700 px-2 py-1 rounded-lg transition-colors ms-auto whitespace-nowrap">
                  {m.adminDelete()}
                </button>
              </div>
            </div>

            {/* Rejection reason input */}
            {rejectingId === product._id && (
              <div className="border-t border-red-100 px-4 py-3 bg-red-50 rounded-b-xl">
                <p className="text-xs font-medium text-red-600 mb-2">{m.adminRejectReason()}</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={m.adminRejectPlaceholder()}
                  rows={2}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={() => reject(product)} disabled={!rejectReason.trim()}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {m.adminRejectSubmit()}
                  </button>
                  <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="text-xs bg-white text-[var(--color-ink-fade)] px-3 py-1.5 rounded-lg border border-[var(--color-hairline)] hover:bg-white">
                    {m.adminCancel()}
                  </button>
                </div>
              </div>
            )}

            {/* Expanded photos + description */}
            {expanded === product._id && (
              <div className="border-t border-[var(--color-hairline)] px-4 py-3 bg-white rounded-b-xl">
                {product.photos?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {product.photos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url} alt=""
                          className={`w-24 h-24 object-cover rounded-lg border transition-all ${confirmPhoto === `${product._id}:${i}` ? "border-red-400 opacity-60" : "border-[var(--color-hairline)]"}`}
                        />
                        {confirmPhoto === `${product._id}:${i}` ? (
                          /* Step 2 — confirm or cancel */
                          <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/30">
                            <button
                              type="button"
                              onClick={async () => {
                                const next = product.photos.filter((_, j) => j !== i);
                                await adminUpdatePhotos({ id: product._id, photos: next });
                                await log("photo_removed", product, `Photo ${i + 1} removed`);
                                setConfirmPhoto(null);
                              }}
                              className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                              title="Confirm delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPhoto(null)}
                              className="w-7 h-7 bg-white hover:bg-white/60 text-[var(--color-ink-soft)] rounded-full flex items-center justify-center shadow"
                              title="Cancel"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          /* Step 1 — tap to start delete */
                          <button
                            type="button"
                            onClick={() => setConfirmPhoto(`${product._id}:${i}`)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow"
                            title="Remove photo"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {product.photos?.length > 0 && (
                  <p className="text-xs text-[var(--color-ink-fade)] mb-3 hidden sm:block">Hover a photo and click × to remove it.</p>
                )}
                {product.description && (
                  <p className="text-sm text-[var(--color-ink-soft)] whitespace-pre-line">{product.description}</p>
                )}
                {product.notes && (
                  <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-2">{product.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation bottom sheet */}
      {confirmDel && (
        <BottomSheet open={true} onClose={() => setConfirmDel(null)} title="Delete Product">
          <div className="p-4 sm:p-3">
            <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
              Delete this product?
            </p>
            <p className="text-xs text-[var(--color-ink-fade)] mb-3">
              This action cannot be undone. The product will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteProduct(confirmDel)}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                Delete
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
                {m.adminCancel()}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Feature confirmation dialog */}
      {confirmFeature && (
        <BottomSheet open={true} onClose={() => { setConfirmFeature(null); setFeaturedPosition(null); }} title={confirmFeature.action === 'feature' ? 'Feature Product — Choose Position' : 'Unfeature Product'}>
          <div className="p-4 sm:p-3">
            {confirmFeature.action === 'feature' ? (
              <>
                <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
                  Feature this product?
                </p>
                <p className="text-xs text-[var(--color-ink-fade)] mb-3">
                  This product will be featured for {confirmFeature.duration || 'unlimited time'}.
                  {featuredPosition && featuredPosition !== 'none' ? ` Position: #${featuredPosition}` : ' Position: Auto (date-sorted)'}
                </p>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">
                    Feature Position (Optional)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
                      className="w-full text-sm px-3 py-2 border border-[var(--color-hairline)] rounded-lg bg-white text-[var(--color-ink)] text-start focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-400)] hover:bg-[var(--color-cream)]"
                    >
                      {featuredPosition ? `Position #${featuredPosition}` : 'None (date-sorted at end)'}
                    </button>
                    {isPositionDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-[var(--color-hairline)] rounded-lg shadow-lg z-50">
                        <button
                          type="button"
                          onClick={() => {
                            setFeaturedPosition(null);
                            setIsPositionDropdownOpen(false);
                          }}
                          className="w-full text-start px-3 py-2 text-sm hover:bg-[var(--color-cream)] border-b border-[var(--color-hairline)]"
                        >
                          None (date-sorted at end)
                        </button>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pos => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => {
                              setFeaturedPosition(pos);
                              setIsPositionDropdownOpen(false);
                            }}
                            className={`w-full text-start px-3 py-2 text-sm hover:bg-[var(--color-cream)] ${
                              featuredPosition === pos ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)] font-semibold" : ""
                            } ${pos < 10 ? "border-b border-[var(--color-hairline)]" : ""}`}
                          >
                            Position #{pos}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-fade)] mt-1.5">
                    1 = first in carousel, 10 = last. Products at same position rotate fairly.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
                  Unfeature this product?
                </p>
                <p className="text-xs text-[var(--color-ink-fade)] mb-3">
                  This product will no longer be featured.
                </p>
              </>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const product = products?.find(p => p._id === confirmFeature.productId);
                    if (confirmFeature.action === 'feature') {
                      // Convert null to undefined for Convex optional validator
                      const positionArg = featuredPosition === null ? undefined : featuredPosition;
                      await setFeatured({ id: confirmFeature.productId, featured: true, featuredUntil: confirmFeature.until, featuredPosition: positionArg });
                      await log("featured", product, confirmFeature.duration + (featuredPosition ? ` - Position #${featuredPosition}` : ''));
                    } else {
                      await setFeatured({ id: confirmFeature.productId, featured: false });
                      await log("unfeatured", product);
                    }
                    setConfirmFeature(null);
                    setFeaturedPosition(null);
                  } catch (error) {
                    console.error("Feature action failed:", error);
                    alert("Action failed: " + (error.message || "Unknown error"));
                  }
                }}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                {confirmFeature.action === 'feature' ? 'Feature' : 'Unfeature'}
              </button>
              <button
                onClick={() => setConfirmFeature(null)}
                className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
                {m.adminCancel()}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

    </div>
  );
}
