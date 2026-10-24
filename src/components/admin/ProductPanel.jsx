import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { brandFitsCategory, getBrandChoices } from "@/lib/brands";
import { priceInfo } from "@/convex/discount";
import { rotatePhoto } from "@/lib/rotateImage";
import { useImageUpload } from "@/lib/useImageUpload";
import { errorMessage } from "@/lib/errors";
import { photoProps } from "@/lib/images";
import { useProductActions } from "@/components/admin/useProductActions";
import { actionLabel } from "@/components/admin/logActions";
import {
  Panel, StatusChip, StoreTag, Code, SectionTitle, Segmented, Switch, ConfirmBox, AmountInput, Avatar, Thumb,
  btn, fmtIQD, inputCls, labelCls, useToast, useCopy, waLink, ltrPhone,
  IconRotate, IconStar, IconTrash, IconCheck, IconX, IconCopy, IconWhatsApp, IconExternal,
} from "@/components/admin/ui";

const CONDITIONS = [
  { value: "new", label: () => m.conditionNew() },
  { value: "likenew", label: () => m.conditionLikeNew() },
  { value: "used", label: () => m.conditionUsed() },
];

// Reject reasons are always in Kurdish, whatever language the admin page is
// in, since the seller reads them.
const KU = { locale: "ckb" };
export const REJECT_REASONS = [
  () => m.rejectReasonPhotos({}, KU), () => m.rejectReasonCategory({}, KU), () => m.rejectReasonPrice({}, KU),
  () => m.rejectReasonNotBaby({}, KU), () => m.rejectReasonDuplicate({}, KU), () => m.rejectReasonDetails({}, KU),
  () => m.rejectReasonOwnPhoto({}, KU),
];

const isSoldish = (p) => p.status === "sold" || p.status === "paid";
const shownPrice = (p) => (isSoldish(p) ? (p.salePrice ?? p.price) : p.price);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const timeAgo = (iso) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : day(iso);
};

// Reject with a reason: tap a ready reason (in Kurdish, as the seller sees it)
// or write one.
export function RejectBox({ onReject, onCancel, busy }) {
  const [reason, setReason] = useState("");
  return (
    <div className="rounded-2xl bg-st-rejected-bg p-3.5 space-y-2.5">
      <p className="text-[13px] font-bold text-adm-ink">{m.adminRejectReason()}</p>
      <div className="flex flex-wrap gap-1.5">
        {REJECT_REASONS.map((r) => (
          <button key={r()} type="button" onClick={() => setReason(r())}
            className={`h-8 px-3 rounded-full border text-[12.5px] font-semibold ${reason === r() ? "bg-st-rejected text-white border-st-rejected" : "border-st-rejected/40 text-st-rejected bg-adm-surface"}`}>
            {r()}
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} dir="auto" placeholder={m.adminRejectPlaceholder()}
        className={`${inputCls} h-auto py-2.5 resize-none`} />
      <div className="flex gap-2">
        <button type="button" disabled={!reason.trim() || busy} onClick={() => onReject(reason)} className={`${btn("primary")} flex-1`}>{m.adminRejectSubmit()}</button>
        {onCancel && <button type="button" onClick={onCancel} className={`${btn("outline")} flex-1`}>{m.adminCancel()}</button>}
      </div>
      <p className="text-[11.5px] text-adm-soft">The seller is notified with this reason and can fix and resubmit.</p>
    </div>
  );
}

function PhotoTile({ product, url, index, isMain, onlyOne, actions, toast }) {
  const upload = useImageUpload();
  const [turns, setTurns] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function saveRotation() {
    setSaving(true);
    try {
      const file = await rotatePhoto(url, turns);
      const newUrl = await upload(file);
      await actions.swapPhoto(product, index, url, newUrl, turns);
      setTurns(0);
      toast("Photo rotated");
    } catch (err) {
      toast(errorMessage(err, "Could not rotate the photo"), "error");
    } finally {
      setSaving(false);
    }
  }

  const round = "w-8 h-8 rounded-full grid place-items-center shadow bg-white/95 text-[#0b0c0f]";
  return (
    <div className={`relative aspect-square rounded-xl overflow-hidden bg-adm-sunk ring-2 ${isMain ? "ring-adm-accent" : "ring-transparent"}`}>
      <img {...photoProps(url, 320)} alt="" className="w-full h-full object-cover transition-transform duration-200" style={turns ? { transform: `rotate(${turns * 90}deg)` } : undefined} />
      {isMain && <span className="absolute top-1.5 start-1.5 text-[10px] font-bold bg-adm-accent text-white rounded-full px-2 py-0.5">Main</span>}
      {saving ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40"><span className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>
      ) : confirmDel ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45">
          <button type="button" aria-label="Confirm delete photo" className="w-9 h-9 rounded-full grid place-items-center bg-st-rejected text-white shadow"
            onClick={async () => { setConfirmDel(false); try { await actions.removePhoto(product, index); toast("Photo deleted"); } catch (err) { toast(errorMessage(err, "Could not delete"), "error"); } }}>
            <IconCheck className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Keep photo" className={round} onClick={() => setConfirmDel(false)}><IconX className="w-4 h-4" /></button>
        </div>
      ) : turns ? (
        <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1.5">
          <button type="button" aria-label="Rotate again" className={round} onClick={() => setTurns((t) => (t + 1) % 4)}><IconRotate className="w-4 h-4" /></button>
          <button type="button" aria-label="Save rotation" className="w-8 h-8 rounded-full grid place-items-center shadow bg-[#c80037] text-white" onClick={saveRotation}><IconCheck className="w-4 h-4" /></button>
          <button type="button" aria-label="Cancel rotation" className={round} onClick={() => setTurns(0)}><IconX className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="absolute inset-x-1 bottom-1 flex justify-between">
          <button type="button" aria-label="Rotate photo" className={round} onClick={() => setTurns(1)}><IconRotate className="w-4 h-4" /></button>
          {!isMain && (
            <button type="button" aria-label="Make main photo" className={round}
              onClick={async () => { await actions.setMainPhoto(product, index); toast("Main photo changed"); }}>
              <IconStar className="w-4 h-4" />
            </button>
          )}
          {!onlyOne && (
            <button type="button" aria-label="Delete photo" className={`${round} !text-[#c53030]`} onClick={() => setConfirmDel(true)}><IconTrash className="w-4 h-4" /></button>
          )}
        </div>
      )}
    </div>
  );
}

const SPONSOR_FOR = [
  { label: "7 days", days: 7 }, { label: "14 days", days: 14 }, { label: "30 days", days: 30 }, { label: "No end date", days: null },
];

function SponsorBox({ product, actions, toast }) {
  const [open, setOpen] = useState(false);
  const [len, setLen] = useState(SPONSOR_FOR[0]);
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const on = !!product.featured;

  async function start() {
    setBusy(true);
    try {
      const until = len.days ? new Date(Date.now() + len.days * 864e5).toISOString().slice(0, 10) : undefined;
      await actions.sponsor(product, { until, position: pos, label: len.label });
      toast("Sponsored");
      setOpen(false);
    } catch (err) { toast(errorMessage(err, "Could not sponsor"), "error"); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 space-y-3">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-xl grid place-items-center ${on ? "bg-st-pending-bg text-st-pending" : "bg-adm-sunk text-adm-fade"}`}><IconStar filled={on} className="w-[18px] h-[18px]" /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold">Sponsored</p>
          <p className="text-[12px] text-adm-fade">
            {on ? [product.featuredUntil ? `Until ${product.featuredUntil}` : "No end date", product.featuredPosition ? `Position #${product.featuredPosition}` : "Auto position"].join(" · ") : "Shows at the top of the home page"}
          </p>
        </div>
        <Switch checked={on || open} label="Sponsored" onChange={(v) => { if (on && !v) setConfirmStop(true); else setOpen(v); }} />
      </div>
      {!on && open && (
        <div className="space-y-3">
          <div>
            <p className={labelCls}>For how long</p>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_FOR.map((o) => (
                <button key={o.label} type="button" onClick={() => setLen(o)}
                  className={`h-9 px-3 rounded-full border text-[12.5px] font-semibold ${len === o ? "bg-adm-ink text-adm-surface border-adm-ink" : "border-adm-line text-adm-soft"}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={labelCls}>Position on the home page</p>
            <div className="grid grid-cols-6 gap-1.5">
              {[null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n ?? "auto"} type="button" onClick={() => setPos(n)}
                  className={`h-9 rounded-lg text-[12.5px] font-semibold ${pos === n ? "bg-adm-ink text-adm-surface" : "bg-adm-sunk text-adm-soft"}`}>{n ?? "Auto"}</button>
              ))}
            </div>
            <p className="text-[11.5px] text-adm-fade mt-1">1 shows first. Auto puts it after the numbered ones, newest first.</p>
          </div>
          <button type="button" onClick={start} disabled={busy} className={`${btn("dark")} w-full`}>Sponsor for {len.label.toLowerCase()}</button>
        </div>
      )}
      {confirmStop && (
        <ConfirmBox title="Stop sponsoring?" text="It goes back to its normal place on the home page." confirmLabel="Stop sponsoring" tone="neutral"
          onCancel={() => setConfirmStop(false)}
          onConfirm={async () => { setConfirmStop(false); await actions.unsponsor(product); toast("No longer sponsored"); }} />
      )}
    </div>
  );
}

// Everything about one product in one place. `product` comes live from the
// products list, so changes show straight away.
export default function ProductPanel({ product, onClose }) {
  const actions = useProductActions();
  const toast = useToast();
  const copy = useCopy();
  const logs = useQuery(api.adminLogs.getAll);
  const [nextStatus, setNextStatus] = useState(null);
  const [salePrice, setSalePrice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("used");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const id = product?._id;
  useEffect(() => {
    if (!product) return;
    setTitle(product.title); setCategory(product.category); setBrand(product.brand ?? "");
    setCondition(product.storeId ? "new" : product.condition); setDescription(product.description ?? "");
    setPrice(shownPrice(product)); setNextStatus(null); setConfirmDelete(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const liveBrands = useQuery(api.products.listBrands, category ? { category } : "skip");
  const brandCounts = useMemo(() => Object.fromEntries((liveBrands ?? []).map((b) => [b.brand, b.count])), [liveBrands]);

  const history = useMemo(
    () => (logs ?? []).filter((l) => l.productId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [logs, id],
  );

  if (!product) return null;
  const p = product;
  const soldish = isSoldish(p);
  const dirty =
    title.trim() !== p.title || category !== p.category || (brand || "") !== (p.brand ?? "") ||
    condition !== (p.storeId ? "new" : p.condition) || description.trim() !== (p.description ?? "").trim() ||
    (price && price !== shownPrice(p));

  async function run(fn, done) {
    setBusy(true);
    try { await fn(); if (done) toast(done); setNextStatus(null); }
    catch (err) { toast(errorMessage(err, "Something went wrong"), "error"); }
    finally { setBusy(false); }
  }

  function chooseStatus(s) {
    if (s === p.status) { setNextStatus(null); return; }
    setNextStatus(s);
    if (s === "sold" || s === "paid") setSalePrice(p.salePrice ?? priceInfo(p).price);
  }

  async function saveDetails() {
    if (!title.trim()) { toast("Title is required", "error"); return; }
    await run(() => actions.saveDetails(p, { title: title.trim(), category, brand: brand || undefined, condition, description: description.trim(), price }), "Changes saved");
  }

  const discount = priceInfo(p);
  const main = p.mainPhotoIndex ?? 0;

  return (
    <Panel open onClose={onClose} wide
      leading={<Thumb src={p.photos?.[main]} size={44} />}
      title={p.title}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.seq && <Code>{p.seq}</Code>}
          {p.storeId && <StoreTag />}
          <StatusChip status={p.status} />
          {p.featured && <span className="text-st-pending"><IconStar filled className="w-3.5 h-3.5" /></span>}
        </div>
      }
      footer={
        <>
          <button type="button" onClick={() => setConfirmDelete(true)} className={btn("ghost")} aria-label="Delete product">
            <IconTrash className="w-4 h-4" /> <span className="max-sm:hidden">{m.adminDelete()}</span>
          </button>
          {p.status === "approved" && (
            <a href={`/products/${p._id}`} target="_blank" rel="noopener noreferrer" className={btn("ghost")} aria-label="Open on the site">
              <IconExternal className="w-4 h-4" /> <span className="max-sm:hidden">On site</span>
            </a>
          )}
          <div className="flex-1" />
          <button type="button" onClick={saveDetails} disabled={!dirty || busy} className={`${btn("dark", "lg")} min-w-[140px]`}>Save changes</button>
        </>
      }
    >
      {confirmDelete && (
        <ConfirmBox title="Delete this product?" text="It is removed for good, with its photos. This can't be undone." confirmLabel="Delete product" busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => run(async () => { await actions.remove(p); onClose(); }, "Product deleted")} />
      )}

      {p.soldReportedAt && p.status === "approved" && (
        <p className="rounded-2xl bg-st-sold-bg text-st-sold px-4 py-3 text-[13px] font-semibold">
          The seller says this sold ({new Date(p.soldReportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}). Set it to Sold below and confirm the sale price.
        </p>
      )}

      {/* Seller asked to delete */}
      {p.status === "deletion_requested" && (
        <div className="rounded-2xl bg-st-delete-bg p-3.5 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-st-delete">{m.adminDeleteReasonLabel()}</p>
          <p className="text-[14px] whitespace-pre-line">{p.deleteRequestReason || "—"}</p>
          {p.deleteRequestFrom && p.deleteRequestFrom !== "approved" && <p className="text-[12px] font-semibold text-st-delete">{m.adminDeleteFromPending()}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={btn("primary", "sm")} onClick={() => run(async () => { await actions.resolveDelete(p, "approve"); onClose(); }, "Deleted")}>{m.adminApproveDelete()}</button>
            {!(p.stock > 1) && (p.deleteRequestFrom ?? "approved") === "approved" && (
              <button type="button" disabled={busy} className={btn("outline", "sm")} onClick={() => run(() => actions.resolveDelete(p, "sold"), "Marked sold")}>{m.adminMarkSold()}</button>
            )}
            <button type="button" disabled={busy} className={btn("outline", "sm")} onClick={() => run(() => actions.resolveDelete(p, "reject"), "Kept live")}>Keep it live</button>
          </div>
        </div>
      )}

      {/* Status */}
      <section>
        <SectionTitle>Status</SectionTitle>
        <Segmented size="sm"
          value={nextStatus ?? p.status}
          onChange={chooseStatus}
          options={["pending", "approved", "rejected", "sold", "paid"].map((s) => ({
            value: s, label: s === "approved" ? m.statusApproved() : s === "pending" ? m.statusPending() : s === "rejected" ? m.statusRejected() : s === "sold" ? m.statusSold() : m.statusPaid(),
          }))} />
        {p.status === "rejected" && !nextStatus && p.notes && (
          <p className="mt-2 text-[12.5px] text-st-rejected bg-st-rejected-bg rounded-xl px-3 py-2">{p.notes}</p>
        )}
        {nextStatus === "rejected" && <div className="mt-3"><RejectBox busy={busy} onCancel={() => setNextStatus(null)} onReject={(why) => run(() => actions.reject(p, why), "Rejected, seller notified")} /></div>}
        {(nextStatus === "sold" || nextStatus === "paid") && (
          <div className="mt-3 rounded-2xl bg-st-sold-bg p-3.5 space-y-2">
            <label htmlFor="sale-price" className="text-[12px] font-bold text-st-sold">Sale price, what the buyer paid (IQD)</label>
            <AmountInput id="sale-price" value={salePrice} onChange={setSalePrice} />
            <p className="text-[11.5px] text-adm-soft">
              {discount.original !== null ? `Discount running: ${discount.percent}% off ${fmtIQD(discount.original)}. ` : `Listed at ${fmtIQD(p.price)}. `}
              The sale and the service fee are recorded on this price.
              {actions.isStocked(p) ? ` Records one unit; stock goes from ${p.stock} to ${p.stock - 1} and the product stays live.` : ""}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={!salePrice || busy} className={`${btn("dark")} flex-1`}
                onClick={() => run(() => (nextStatus === "sold" ? actions.markSold(p, salePrice) : actions.markPaid(p, salePrice)), nextStatus === "sold" ? "Marked sold" : "Marked paid")}>
                {nextStatus === "sold" ? m.adminMarkSold() : m.adminMarkPaid()}
              </button>
              <button type="button" className={`${btn("outline")} flex-1`} onClick={() => setNextStatus(null)}>{m.adminCancel()}</button>
            </div>
          </div>
        )}
        {(nextStatus === "approved" || nextStatus === "pending") && (
          <div className="mt-3">
            <ConfirmBox tone="neutral" busy={busy}
              title={nextStatus === "approved" ? (p.soldFromId && soldish ? "Buyer cancelled?" : "Make it live?") : "Move back to pending?"}
              text={nextStatus === "approved"
                ? (p.soldFromId && soldish ? "This unit goes back into the product's stock (+1) and this entry is removed." : "It shows on the site and the seller is notified.")
                : "It is hidden from the site until approved again."}
              confirmLabel={nextStatus === "approved" ? m.adminApprove() : "Move to pending"}
              onCancel={() => setNextStatus(null)}
              onConfirm={() => run(() => (nextStatus === "approved" ? actions.makeLive(p) : actions.setPending(p)), nextStatus === "approved" ? "Live, seller notified" : "Moved to pending")} />
          </div>
        )}
      </section>

      {/* Photos */}
      <section>
        <SectionTitle>Photos · {p.photos?.length ?? 0}</SectionTitle>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {(p.photos ?? []).map((url, i) => (
            <PhotoTile key={url + i} product={p} url={url} index={i} isMain={i === main} onlyOne={p.photos.length === 1} actions={actions} toast={toast} />
          ))}
        </div>
        <p className="text-[11.5px] text-adm-fade mt-1.5">Rotate turns the preview first; ✓ saves it once. The star makes a photo the main one.</p>
      </section>

      {/* Money */}
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{soldish ? "Sold for" : "Price"}</p>
          <p className="text-[15px] font-bold tabular-nums" dir="ltr">{fmtIQD(shownPrice(p))}</p>
        </div>
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{m.adminProfitLabel()}</p>
          <p className="text-[15px] font-bold tabular-nums text-adm-accent" dir="ltr">{fmtIQD(p.profit)}</p>
        </div>
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{p.stock > 1 ? "In stock" : soldish ? "Sold on" : "Posted"}</p>
          <p className="text-[13px] font-bold truncate">{p.stock > 1 ? p.stock : day(soldish ? p.dateSold : p.dateAdded)}</p>
        </div>
      </section>

      {/* Details */}
      <section className="space-y-3">
        <SectionTitle>Details</SectionTitle>
        <div>
          <label htmlFor="d-title" className={labelCls}>{m.fieldTitle()}</label>
          <input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>{m.fieldCategory()}</p>
            <CustomSelect inline listClassName="max-h-56" value={category}
              onChange={(next) => { setCategory(next); setBrand((b) => (brandFitsCategory(b, next) ? b : "")); }}
              options={CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value }))} />
          </div>
          <div>
            <p className={labelCls}>{m.fieldBrand()}</p>
            <CustomSelect inline listClassName="max-h-56" value={brand} onChange={setBrand} placeholder="None"
              options={[{ value: "", label: "None" }, ...getBrandChoices(category, brand, brandCounts).map((b) => ({ value: b, label: b }))]} />
          </div>
        </div>
        <div>
          <p className={labelCls}>{m.fieldCondition()}</p>
          <Segmented size="sm" value={condition} onChange={(v) => !p.storeId && setCondition(v)}
            options={CONDITIONS.map((c) => ({ value: c.value, label: c.label() }))} />
          {p.storeId && <p className="text-[11.5px] text-adm-fade mt-1">Store products are always new.</p>}
        </div>
        <div>
          <label htmlFor="d-price" className={labelCls}>{soldish ? "Sale price (IQD)" : `${m.fieldPrice()} (IQD)`}</label>
          <AmountInput id="d-price" value={price} onChange={setPrice} />
          <p className="text-[11.5px] text-adm-fade mt-1">
            {price && price !== shownPrice(p)
              ? `Was ${fmtIQD(shownPrice(p))}. The service fee is worked out again on save, and the seller is notified.`
              : soldish ? "What the buyer paid. The service fee follows this price." : "Change it when the seller agreed a lower price. The service fee follows it."}
          </p>
        </div>
        <div>
          <label htmlFor="d-desc" className={labelCls}>{m.fieldDescription()}</label>
          <textarea id="d-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-auto py-2.5 resize-none`} />
        </div>
      </section>

      {/* Seller */}
      <section>
        <SectionTitle>Seller</SectionTitle>
        <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={p.sellerName} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate">{p.sellerName}{p.storeName ? <span className="text-adm-fade font-normal"> · {p.storeName}</span> : null}</p>
              <p className="text-[12.5px] text-adm-soft tabular-nums" dir="ltr">{p.sellerPhone}</p>
              {(p.city || p.sellerAddress) && <p className="text-[12px] text-adm-fade truncate">{p.city}{p.sellerAddress ? `, ${p.sellerAddress}` : ""}</p>}
            </div>
          </div>
          {p.sellerPhone && (
            <div className="grid grid-cols-2 gap-2">
              <a href={waLink(p.sellerPhone)} target="_blank" rel="noopener noreferrer" className={btn("wa")}><IconWhatsApp className="w-4 h-4" /> WhatsApp</a>
              <button type="button" onClick={() => copy(`${m.adminContact()} ${ltrPhone(p.sellerPhone)}`, "Number copied")} className={btn("outline")}><IconCopy className="w-4 h-4" /> {m.copyNumber()}</button>
            </div>
          )}
          <Link to="/admin/products" search={{ tab: "all", sellerId: p.sellerId }} onClick={onClose} className="block text-[12.5px] font-semibold text-adm-accent">
            All products from this seller →
          </Link>
        </div>
      </section>

      <SponsorBox product={p} actions={actions} toast={toast} />

      {/* History */}
      <section>
        <SectionTitle>History</SectionTitle>
        <ol className="space-y-2.5">
          {history.map((l) => (
            <li key={l._id} className="grid grid-cols-[10px_1fr] gap-2.5 text-[12.5px]">
              <span className="w-2 h-2 rounded-full bg-adm-line mt-1.5" />
              <div className="min-w-0">
                <span className="font-semibold">{actionLabel(l.action)}</span>
                <span className="text-adm-fade"> · {l.adminName || l.sellerName || ""} · {timeAgo(l.createdAt)}</span>
                {l.notes && <p className="text-adm-soft truncate">{l.notes}</p>}
              </div>
            </li>
          ))}
          <li className="grid grid-cols-[10px_1fr] gap-2.5 text-[12.5px]">
            <span className="w-2 h-2 rounded-full bg-adm-accent mt-1.5" />
            <div><span className="font-semibold">Posted</span><span className="text-adm-fade"> · {p.sellerName} · {day(p.dateAdded)}</span></div>
          </li>
        </ol>
      </section>
    </Panel>
  );
}
