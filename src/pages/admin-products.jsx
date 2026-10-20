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
import CustomSelect from "@/components/ui/CustomSelect";
import { errorMessage } from "@/lib/errors";
import FlipPanel from "@/components/ui/FlipPanel";
import CopyButton from "@/components/admin/CopyButton";
import ProductDetailsDialog from "@/components/admin/ProductDetailsDialog";
import { StarIcon, EditIcon, TrashIcon, iconButtonCls } from "@/components/admin/ActionIcons";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;

const STATUS_STYLE = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  sold:     "bg-blue-100 text-blue-700",
  paid:     "bg-purple-100 text-purple-700",
  deletion_requested: "bg-orange-100 text-orange-700",
};

const TABS = ["all","pending","approved","rejected","sold","paid","deletion_requested","sponsored"];

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const sellerId = searchParams.get("sellerId");

  const products        = useQuery(api.products.getAll);
  const updateStatus    = useMutation(api.products.updateStatus);
  const markUnitSoldMutation = useMutation(api.products.markUnitSold);
  const returnUnitMutation = useMutation(api.products.returnUnit);
  const resolveDeleteRequest = useMutation(api.products.resolveDeleteRequest);
  const [deleteActionError, setDeleteActionError] = useState({});
  const removeProduct       = useMutation(api.products.remove);
  const adminUpdatePhotos   = useMutation(api.products.adminUpdatePhotos);
  const setFeatured         = useMutation(api.products.setFeatured);
  const createNotif     = useMutation(api.notifications.create);
  const createLog       = useMutation(api.adminLogs.create);

  const me = useQuery(api.users.getCurrent);
  const adminEmail = me?.email ?? "admin";

  const [featuredPickerId, setFeaturedPickerId] = useState(null);
  const [featuredPosition, setFeaturedPosition] = useState(null); // Selected position 1-10 or null
  const [tab,          setTab]          = useState(searchParams.get("tab") ?? "pending");
  const [search,       setSearch]       = useState("");
  const [rejectingId,  setRejectingId]  = useState(focusId ?? null);
  const [rejectReason, setRejectReason] = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [confirmPhoto, setConfirmPhoto] = useState(null); // "productId:photoIndex"
  const [confirmFeature, setConfirmFeature] = useState(null); // { productId, action: 'feature' | 'unfeature', duration }
  const [editingDetails, setEditingDetails] = useState(null); // product whose details dialog is open

  const statusLabels = {
    all:       m.adminAllStatus(),
    pending:   m.statusPending(),
    approved:  m.statusApproved(),
    rejected:  m.statusRejected(),
    sold:      m.statusSold(),
    paid:      m.statusPaid(),
    deletion_requested: m.adminDeleteRequests(),
    sponsored: "Sponsored",
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    let list;

    // If filtering by seller, start with only that seller's products
    if (sellerId) {
      list = products.filter((p) => p.sellerId === sellerId);
    } else if (tab === "all") {
      list = products;
    } else if (tab === "sponsored") {
      list = products.filter((p) => p.featured === true);
    } else {
      list = products.filter((p) => p.status === tab);
    }

    const q = search.trim().toLowerCase();
    const searched = q
      ? list.filter((p) =>
          p.title.toLowerCase().includes(q) ||
          (p.seq ?? "").toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.city ?? "").toLowerCase().includes(q)
        )
      : list;
    return [...searched].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }, [products, tab, search, sellerId]);

  const counts = useMemo(() => {
    if (!products) return {};
    return Object.fromEntries(
      TABS.map((s) => {
        if (s === "all") return [s, products.length];
        if (s === "sponsored") return [s, products.filter((p) => p.featured === true).length];
        return [s, products.filter((p) => p.status === s).length];
      })
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
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminRejectMsg({ title: product.title, reason: rejectReason.trim() }), url: `/seller/products/${product._id}/edit?from=rejection` });
    await log("rejected", product, rejectReason.trim());
    setRejectingId(null);
    setRejectReason("");
  }

  async function markSold(product, salePrice) {
    await updateStatus({ id: product._id, status: "sold", dateSold: new Date().toISOString(), salePrice });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminSoldMsg({ title: product.title }), url: `/seller` });
    await log("marked_sold", product);
  }

  async function markPaid(product, salePrice) {
    await updateStatus({ id: product._id, status: "paid", salePrice });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminPaidMsg({ title: product.title }), url: `/seller` });
    await log("marked_paid", product);
  }

  async function markUnitSold(product, status, salePrice) {
    await markUnitSoldMutation({ id: product._id, status, salePrice });
    const msg = status === "sold" ? m.adminSoldMsg({ title: product.title }) : m.adminPaidMsg({ title: product.title });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: msg, url: `/seller` });
    await log(status === "sold" ? "marked_sold" : "marked_paid", product, `1 unit, ${product.stock - 1} left`);
  }

  async function returnUnit(product) {
    await returnUnitMutation({ id: product._id });
    await log("unit_returned", product, "Unit returned to stock");
  }

  async function handleDeleteRequest(product, action) {
    setDeleteActionError((e) => ({ ...e, [product._id]: "" }));
    try {
      await resolveDeleteRequest({ id: product._id, action });
    } catch (err) {
      const msg = errorMessage(err, "Failed");
      setDeleteActionError((e) => ({ ...e, [product._id]: msg }));
      return;
    }
    if (action === "approve") {
      await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminDeleteApprovedMsg({ title: product.title }), url: `/seller` });
      await log("deleted", product, "Deletion request approved");
    } else if (action === "reject") {
      await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminDeleteRejectedMsg({ title: product.title }), url: `/seller` });
      await log("delete_rejected", product, "Deletion request declined");
    } else {
      await createNotif({ sellerId: product.sellerId, productId: product._id, message: m.adminSoldMsg({ title: product.title }), url: `/seller` });
      await log("marked_sold", product, "From a deletion request");
    }
  }

  async function deleteProduct(id) {
    const product = products?.find(p => p._id === id);
    await removeProduct({ id });
    await log("deleted", product);
    setConfirmDel(null);
  }

  async function handleStatusChange(product, newStatus, extra) {
    switch (newStatus) {
      case "pending":
        await updateStatus({ id: product._id, status: "pending" });
        await log("status_changed_to_pending", product);
        break;
      case "approved":
        if (product.soldFromId && (product.status === "sold" || product.status === "paid")) await returnUnit(product);
        else await approve(product);
        break;
      case "rejected":
        setRejectingId(product._id);
        setRejectReason("");
        break;
      case "sold":
        if (product.status === "approved" && product.stock > 1) await markUnitSold(product, "sold", extra?.salePrice);
        else await markSold(product, extra?.salePrice);
        break;
      case "paid":
        if (product.status === "approved" && product.stock > 1) await markUnitSold(product, "paid", extra?.salePrice);
        else await markPaid(product, extra?.salePrice);
        break;
    }
  }

  // Called after the Edit details dialog saved: log which fields changed.
  async function logDetailsChange(product, next) {
    const labels = { title: "title", category: "category", brand: "brand", condition: "condition", description: "description" };
    const changed = Object.keys(labels).filter((k) => (product[k] ?? "") !== (next[k] ?? ""));
    if (changed.length > 0) await log("details_changed", product, `Changed: ${changed.join(", ")}`);
  }


  // Status, Sponsor, Edit and Delete as icon buttons (same row on desktop and mobile).
  function renderActions(product) {
    return (
      <>
        <ProductStatusMenu product={product} onStatusChange={(newStatus, extra) => handleStatusChange(product, newStatus, extra)} />

        <div className="relative">
          {product.featured ? (
            <button
              onClick={() => setConfirmFeature({ productId: product._id, action: 'unfeature' })}
              title="Sponsored — tap to stop" aria-label="Stop sponsoring"
              className={`${iconButtonCls} bg-amber-400 text-white ring-amber-400 hover:bg-amber-500`}
            >
              <StarIcon filled />
            </button>
          ) : (
            <button
              onClick={() => setFeaturedPickerId(featuredPickerId === product._id ? null : product._id)}
              title="Sponsor" aria-label="Sponsor"
              className={`${iconButtonCls} bg-amber-50 text-amber-500 ring-amber-200 hover:bg-amber-100`}
            >
              <StarIcon />
            </button>
          )}

          {featuredPickerId === product._id && (
            <FlipPanel gap="1.5" height={260} className="start-0 z-30 bg-white border border-[var(--color-hairline)] rounded-xl shadow-lg p-2 min-w-[160px]">
              <p className="text-[10px] text-[var(--color-ink-fade)] font-semibold uppercase tracking-wide px-1 pb-1.5">Sponsor for</p>
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
            </FlipPanel>
          )}
        </div>

        <div className="ms-auto sm:ms-0 flex items-center gap-2">
          <button
            onClick={() => setEditingDetails(product)}
            title={m.editBtn()} aria-label={m.editBtn()}
            className={`${iconButtonCls} bg-sky-50 text-sky-600 ring-sky-200 hover:bg-sky-100`}
          >
            <EditIcon />
          </button>
          <button
            onClick={() => setConfirmDel(product._id)}
            title={m.adminDelete()} aria-label={m.adminDelete()}
            className={`${iconButtonCls} bg-red-50 text-red-500 ring-red-200 hover:bg-red-100`}
          >
            <TrashIcon />
          </button>
        </div>
      </>
    );
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
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{m.adminProducts()}</h1>
        {sellerId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs font-semibold text-blue-600">
              Filtered by seller
            </span>
            <button
              onClick={() => window.history.back()}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-fade)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, code (DS-0001), seller name, category, city…"
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
                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Header: title and details on the left, photo on the right */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{product.title}</p>
                      <p className="text-xs text-[var(--color-ink-fade)] mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>{product.condition === "new" ? m.conditionNew() : product.condition === "likenew" ? m.conditionLikeNew() : m.conditionUsed()}</span>
                        {product.seq && <span className="font-mono font-bold text-rose-400">{product.seq}</span>}
                        {product.storeName && <span className="font-semibold text-[var(--color-ink-soft)]">· {product.storeName}</span>}
                        {product.stock > 0 && product.status === "approved" && (
                          <span className="font-semibold bg-[var(--color-honey-50)] text-[var(--color-honey-600)] px-1.5 py-0.5 rounded-full">Stock {product.stock}</span>
                        )}
                        {product.featured && (
                          <span className="font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            {product.featuredPosition ? `Sponsored · Pos #${product.featuredPosition}` : product.featuredUntil ? `Sponsored · until ${product.featuredUntil}` : "Sponsored"}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">{product.category}</span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">{product.brand || "None"}</span>
                      </div>
                    </div>
                    <div
                      className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer"
                      onClick={() => setExpanded(expanded === product._id ? null : product._id)}
                    >
                      {product.photos?.[0]
                        ? <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-200" />
                      }
                    </div>
                  </div>

                  {/* Price + fee + date */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">
                      {formatPrice(product.salePrice ?? product.price)}
                      {product.salePrice != null && product.salePrice !== product.price && (
                        <span className="ms-1.5 text-xs font-medium text-[var(--color-ink-fade)] line-through">{formatPrice(product.price)}</span>
                      )}
                    </span>
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
                      {product.sellerPhone && <CopyButton text={`${m.adminContact()} ${product.sellerPhone}`} />}
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
                  {/* Deletion request from the seller */}
                  {product.status === "deletion_requested" && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600 mb-0.5">{m.adminDeleteReasonLabel()}</p>
                      <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{product.deleteRequestReason}</p>
                      {product.deleteRequestFrom && product.deleteRequestFrom !== "approved" && (
                        <p className="text-xs font-semibold text-orange-600 mt-1">{m.adminDeleteFromPending()}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button onClick={() => handleDeleteRequest(product, "approve")}
                          className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors">
                          {m.adminApproveDelete()}
                        </button>
                        {!(product.stock > 1) && (product.deleteRequestFrom ?? "approved") === "approved" && (
                          <button onClick={() => handleDeleteRequest(product, "sold")}
                            className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors">
                            {m.adminMarkSold()}
                          </button>
                        )}
                        <button onClick={() => handleDeleteRequest(product, "reject")}
                          className="text-xs font-semibold bg-white border border-[var(--color-hairline)] hover:bg-[var(--color-cream)] text-[var(--color-ink)] px-3 py-2 rounded-lg transition-colors">
                          {m.adminReject()}
                        </button>
                      </div>
                      {deleteActionError[product._id] && <p className="text-xs text-red-500 mt-2">{deleteActionError[product._id]}</p>}
                    </div>
                  )}
                </div>

                {/* Actions — desktop only */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {renderActions(product)}
                </div>
              </div>

              {/* Actions — mobile only */}
              <div className="flex sm:hidden items-center gap-2 mt-4">
                {renderActions(product)}
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
                          onClick={async () => {
                            await adminUpdatePhotos({ id: product._id, mainPhotoIndex: i });
                            await log("main_photo_set", product, `Photo ${i + 1} set as main`);
                          }}
                          className={`w-24 h-24 object-cover rounded-lg border transition-all cursor-pointer ${
                            product.mainPhotoIndex === i
                              ? "border-blue-500 ring-2 ring-blue-300"
                              : confirmPhoto === `${product._id}:${i}`
                              ? "border-red-400 opacity-60"
                              : "border-[var(--color-hairline)] hover:border-blue-400"
                          }`}
                        />
                        {product.mainPhotoIndex === i && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            Main
                          </div>
                        )}
                        {confirmPhoto === `${product._id}:${i}` ? (
                          /* Step 2 — confirm or cancel */
                          <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/30">
                            <button
                              type="button"
                              onClick={async () => {
                                const next = product.photos.filter((_, j) => j !== i);
                                const newMainIndex = product.mainPhotoIndex === i ? undefined : product.mainPhotoIndex;
                                await adminUpdatePhotos({ id: product._id, photos: next, mainPhotoIndex: newMainIndex });
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
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity shadow"
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

      {editingDetails && (
        <ProductDetailsDialog
          product={editingDetails}
          onClose={() => setEditingDetails(null)}
          onSaved={(next) => logDetailsChange(editingDetails, next)}
        />
      )}

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
        <BottomSheet open={true} onClose={() => { setConfirmFeature(null); setFeaturedPosition(null); }} title={confirmFeature.action === 'feature' ? 'Sponsor Product — Choose Position' : 'Unsponsored Product'}>
          <div className="p-4 sm:p-3">
            {confirmFeature.action === 'feature' ? (
              <>
                <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
                  Sponsor this product?
                </p>
                <p className="text-xs text-[var(--color-ink-fade)] mb-3">
                  This product will be sponsored for {confirmFeature.duration || 'unlimited time'}.
                  {featuredPosition && featuredPosition !== 'none' ? ` Position: #${featuredPosition}` : ' Position: Auto (date-sorted)'}
                </p>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">
                    Sponsor Position (Optional)
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeaturedPosition(null)}
                      className={`py-2 px-2 text-xs rounded-lg font-medium transition-all ${
                        featuredPosition === null
                          ? "bg-[var(--color-ember-500)] text-white"
                          : "bg-[var(--color-cream)] text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)]"
                      }`}
                    >
                      Auto
                    </button>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setFeaturedPosition(pos)}
                        className={`py-2 px-1 text-xs rounded-lg font-medium transition-all ${
                          featuredPosition === pos
                            ? "bg-[var(--color-ember-500)] text-white"
                            : "bg-[var(--color-cream)] text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)]"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--color-ink-fade)] mt-2">
                    1 = first in carousel, 10 = last. Auto = date-sorted at end.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
                  Remove sponsorship?
                </p>
                <p className="text-xs text-[var(--color-ink-fade)] mb-3">
                  This product will no longer be sponsored.
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
                    console.error("Sponsor action failed:", error);
                    alert("Action failed: " + (error.message || "Unknown error"));
                  }
                }}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                {confirmFeature.action === 'feature' ? 'Sponsor' : 'Remove Sponsorship'}
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
