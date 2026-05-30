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
  const createNotif     = useMutation(api.notifications.create);
  const createLog       = useMutation(api.adminLogs.create);

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? "admin"));
  }, []);

  const [featuredPickerId, setFeaturedPickerId] = useState(null);
  const [tab,          setTab]          = useState(searchParams.get("tab") ?? "pending");
  const [search,       setSearch]       = useState("");
  const [rejectingId,  setRejectingId]  = useState(focusId ?? null);
  const [rejectReason, setRejectReason] = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [confirmPhoto, setConfirmPhoto] = useState(null); // "productId:photoIndex"

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

  if (!products) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">{m.adminProducts()}</h1>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, code (DS-0001), seller name…"
          dir="ltr"
          className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
          <p className="text-sm font-medium">{m.adminNoProducts()}</p>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-3">
        {filtered.map((product) => (
          <div key={product._id} className={`bg-white rounded-xl border transition-colors ${
            rejectingId === product._id ? "border-red-200" : "border-gray-100 hover:border-rose-100"
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[product.status]}`}>
                      {statusLabels[product.status]}
                    </span>
                    {/* Featured button + duration picker */}
                    <div className="relative">
                      {product.featured ? (
                        <button
                          onClick={async () => {
                            await setFeatured({ id: product._id, featured: false });
                            await log("unfeatured", product);
                          }}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                          </svg>
                          {product.featuredUntil
                            ? `Until ${product.featuredUntil}`
                            : "Featured"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setFeaturedPickerId(featuredPickerId === product._id ? null : product._id)}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-gray-100 text-gray-400 border-gray-200 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                          </svg>
                          Feature
                        </button>
                      )}

                      {/* Duration picker popover */}
                      {featuredPickerId === product._id && (
                        <div className="absolute start-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[160px]">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide px-1 pb-1.5">Feature for</p>
                          {[
                            { label: "7 days",   days: 7  },
                            { label: "14 days",  days: 14 },
                            { label: "30 days",  days: 30 },
                            { label: "No expiry", days: null },
                          ].map(opt => (
                            <button key={opt.label}
                              onClick={async () => {
                                const until = opt.days
                                  ? new Date(Date.now() + opt.days * 864e5).toISOString().slice(0, 10)
                                  : undefined;
                                await setFeatured({ id: product._id, featured: true, featuredUntil: until });
                                await log("featured", product, opt.label);
                                setFeaturedPickerId(null);
                              }}
                              className="w-full text-start px-2 py-1.5 text-xs text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Condition + seq */}
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
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
                      <span className="text-xs font-semibold text-gray-700">{product.sellerName}</span>
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
                      <p className="text-xs text-gray-400 flex items-center gap-1">
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
                <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
                  {product.status === "pending" && (
                    <>
                      <button onClick={() => approve(product)}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        {m.adminApprove()}
                      </button>
                      <button onClick={() => { setRejectingId(product._id); setRejectReason(""); }}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-red-100">
                        {m.adminReject()}
                      </button>
                    </>
                  )}
                  {product.status === "approved" && (
                    <button onClick={() => markSold(product)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
                      {m.adminMarkSold()}
                    </button>
                  )}
                  {product.status === "sold" && (
                    <button onClick={() => markPaid(product)}
                      className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-purple-100">
                      {m.adminMarkPaid()}
                    </button>
                  )}
                  {product.status === "rejected" && (
                    <button onClick={() => approve(product)}
                      className="text-xs bg-green-50 hover:bg-green-100 text-green-600 font-semibold px-3 py-1.5 rounded-lg transition-colors border border-green-100">
                      {m.adminApprove()}
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
                      {m.adminDelete()}
                    </button>
                  )}
                </div>
              </div>

              {/* Actions — mobile only */}
              <div className="flex sm:hidden items-center gap-2 mt-3 flex-wrap">
                {product.status === "pending" && (
                  <>
                    <button onClick={() => approve(product)}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                      {m.adminApprove()}
                    </button>
                    <button onClick={() => { setRejectingId(product._id); setRejectReason(""); }}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-lg transition-colors border border-red-100">
                      {m.adminReject()}
                    </button>
                  </>
                )}
                {product.status === "approved" && (
                  <button onClick={() => markSold(product)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-4 py-2 rounded-lg transition-colors border border-blue-100">
                    {m.adminMarkSold()}
                  </button>
                )}
                {product.status === "sold" && (
                  <button onClick={() => markPaid(product)}
                    className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold px-4 py-2 rounded-lg transition-colors border border-purple-100">
                    {m.adminMarkPaid()}
                  </button>
                )}
                {product.status === "rejected" && (
                  <button onClick={() => approve(product)}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-600 font-semibold px-4 py-2 rounded-lg transition-colors border border-green-100">
                    {m.adminApprove()}
                  </button>
                )}
                {confirmDel === product._id ? (
                  <div className="flex gap-1.5 ms-auto">
                    <button onClick={() => deleteProduct(product._id)}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-2 rounded-lg transition-colors">✓</button>
                    <button onClick={() => setConfirmDel(null)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(product._id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors ms-auto">
                    {m.adminDelete()}
                  </button>
                )}
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
                    className="text-xs bg-white text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                    {m.adminCancel()}
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
                      product.status === "pending" ? (
                        <div key={i} className="relative group">
                          <img
                            src={url} alt=""
                            className={`w-24 h-24 object-cover rounded-lg border transition-all ${confirmPhoto === `${product._id}:${i}` ? "border-red-400 opacity-60" : "border-gray-200"}`}
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
                                className="w-7 h-7 bg-white hover:bg-gray-100 text-gray-600 rounded-full flex items-center justify-center shadow"
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
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                        </a>
                      )
                    ))}
                  </div>
                )}
                {product.status === "pending" && product.photos?.length > 0 && (
                  <p className="text-xs text-gray-400 mb-3 hidden sm:block">Hover a photo and click × to remove it before approving.</p>
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
