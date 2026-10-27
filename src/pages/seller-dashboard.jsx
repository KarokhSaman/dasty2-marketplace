import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { useSellerSession } from "@/lib/useSellerSession";
import { formatNumberLocale } from "@/lib/utils";
import { photoProps } from "@/lib/images";
import { errorMessage } from "@/lib/errors";
import OfferTicker from "@/components/seller/OfferTicker";
import { Panel, ConfirmBox, btn, useToast, useCopy, IconCopy, IconCheck, IconWhatsApp, IconTrash, IconChevron } from "@/components/admin/ui";
import StoreIcon from "@/components/ui/StoreIcon";

// Where sellers send their service fees.
export const FEE_PAYMENT_NUMBER = "07724944244";

const EDITABLE = ["pending", "approved", "rejected"];
const STATUS = {
  pending: [() => m.statusPending(), "text-st-pending bg-st-pending-bg"],
  approved: [() => m.statusApproved(), "text-st-approved bg-st-approved-bg"],
  rejected: [() => m.statusRejected(), "text-st-rejected bg-st-rejected-bg"],
  sold: [() => m.statusSold(), "text-st-sold bg-st-sold-bg"],
  paid: [() => m.statusPaid(), "text-st-paid bg-st-paid-bg"],
  deletion_requested: [() => m.statusDeletionRequested(), "text-st-delete bg-st-delete-bg"],
};
const FILTERS = ["all", "approved", "pending", "rejected", "sold", "paid"];

// Which store's products to list — for sellers who run more than one store.
// A pill that opens a sheet: every store as a full-width row with its count.
function StorePicker({ value, onChange, stores, countFor, n }) {
  const [open, setOpen] = useState(false);
  const options = [
    { value: "all", label: m.storeAll() },
    ...stores.map((st) => ({ value: st._id, label: st.name })),
    { value: "none", label: m.fieldStoreNone() },
  ].filter((o) => o.value !== "none" || o.value === value || countFor("none") > 0); // "No store" only when it has products
  const current = options.find((o) => o.value === value) ?? options[0];
  const pick = (v) => { onChange(v); setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 h-8 ps-2.5 pe-2 max-w-[60%] rounded-full border text-[12.5px] font-semibold ${
          value === "all" ? "bg-adm-surface text-adm-ink border-adm-line" : "bg-adm-accent-soft text-adm-accent border-adm-accent"}`}>
        <StoreIcon className="w-4 h-4 shrink-0" />
        <span className="truncate">{current.label}</span>
        <IconChevron className="w-3.5 h-3.5 shrink-0 rotate-90" />
      </button>
      {open && (
        <Panel open onClose={() => setOpen(false)} short title={m.fieldStore()}>
          <div className="rounded-2xl border border-adm-line bg-adm-surface overflow-hidden divide-y divide-adm-line">
            {options.map((o) => {
              const on = o.value === value;
              return (
                <button key={o.value} type="button" onClick={() => pick(o.value)} aria-pressed={on}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-start ${on ? "bg-[var(--color-ember-50)]" : "active:bg-adm-sunk"}`}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-[var(--color-ember-500)] text-white" : "bg-adm-sunk text-adm-soft"}`}>
                    <StoreIcon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span dir="auto" className={`block text-[14.5px] truncate ${on ? "font-bold text-[var(--color-ember-600)]" : "font-semibold text-adm-ink"}`}>{o.label}</span>
                    <span className="block text-[12px] text-adm-fade">{m.storeProductsCount({ count: n(countFor(o.value)) })}</span>
                  </span>
                  {on && <IconCheck className="w-5 h-5 shrink-0 text-[var(--color-ember-500)]" />}
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </>
  );
}

function Status({ status }) {
  const [label, cls] = STATUS[status] ?? [() => status, "text-adm-soft bg-adm-sunk"];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-bold whitespace-nowrap shrink-0 ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{label()}
    </span>
  );
}

// What a seller can do with one product: edit, share, "I sold it", request
// deletion. Products a store manager posted for this account are view-only.
function ProductSheet({ product: p, onClose }) {
  const router = useRouter();
  const toast = useToast();
  const locale = getLocale();
  const reportSold = useMutation(api.products.reportSold);
  const requestDelete = useMutation(api.products.requestDelete);
  const [view, setView] = useState("menu"); // menu | sold | delete
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = !p.postedByManager && EDITABLE.includes(p.status);
  const canShare = p.status === "approved";
  const canSold = !p.postedByManager && p.status === "approved" && !p.soldReportedAt;
  const canDelete = !p.postedByManager && EDITABLE.includes(p.status);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${localizeHref(`/products/${p._id}`, { locale })}`;

  async function run(fn, done) {
    setBusy(true);
    try { await fn(); toast(done); onClose(); }
    catch (err) { toast(errorMessage(err, m.errorGeneral()), "error"); setBusy(false); }
  }

  const row = "w-full flex items-center gap-3 px-4 h-14 text-start border-t border-adm-line first:border-t-0";
  const ic = "w-9 h-9 rounded-xl grid place-items-center bg-adm-sunk shrink-0";

  return (
    <Panel open onClose={onClose} short
      leading={<div className="w-12 h-12 rounded-xl overflow-hidden bg-adm-sunk shrink-0">{p.photos?.[0] && <img {...photoProps(p.photos[0], 120)} alt="" className="w-full h-full object-cover" />}</div>}
      title={p.title}
      subtitle={<div className="flex items-center gap-2 text-[12px] text-adm-fade"><span className="tabular-nums">{formatNumberLocale(p.salePrice ?? p.price, "en")} IQD</span><Status status={p.status} /></div>}>
      {view === "sold" ? (
        <ConfirmBox tone="neutral" busy={busy} title={m.confirmSoldTitle()} text={m.iSoldItSub()} confirmLabel={m.yesSold()}
          onCancel={() => setView("menu")} onConfirm={() => run(() => reportSold({ id: p._id }), m.soldReportedToast())} />
      ) : view === "delete" ? (
        <div className="rounded-2xl bg-st-rejected-bg p-3.5 space-y-2.5">
          <p className="text-[14px] font-bold">{m.requestDeleteTitle()}</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} dir="auto"
            placeholder={m.requestDeleteReasonPlaceholder()}
            className="w-full rounded-xl border border-adm-line bg-adm-surface px-3 py-2.5 text-[14px] outline-none resize-none" />
          <div className="flex gap-2">
            <button type="button" disabled={!reason.trim() || busy} className={`${btn("primary")} flex-1`}
              onClick={() => run(() => requestDelete({ id: p._id, reason: reason.trim() }), m.requestSentToast())}>{m.requestDeleteSend()}</button>
            <button type="button" className={`${btn("outline")} flex-1`} onClick={() => setView("menu")}>{m.adminCancel()}</button>
          </div>
        </div>
      ) : (
        <>
          {p.postedByManager && <p className="rounded-2xl bg-adm-sunk px-4 py-3 text-[13px] text-adm-soft">{m.postedForYou()}</p>}
          {p.soldReportedAt && <p className="rounded-2xl bg-st-sold-bg text-st-sold px-4 py-3 text-[13px] font-bold">✓ {m.soldReported()}</p>}
          {(canEdit || canShare || canSold || canDelete) && (
            <div className="rounded-2xl border border-adm-line bg-adm-surface overflow-hidden">
              {canEdit && (
                <button type="button" className={row} onClick={() => router.navigate({ to: `/seller/products/${p._id}/edit` })}>
                  <span className={ic}><svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /></svg></span>
                  <span className="flex-1 text-[14.5px] font-semibold">{m.editBtn()}</span>
                  <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />
                </button>
              )}
              {canShare && (
                <a className={row} target="_blank" rel="noopener noreferrer" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${p.title}\n${link}`)}`}>
                  <span className={`${ic} text-adm-wa`}><IconWhatsApp /></span>
                  <span className="flex-1 text-[14.5px] font-semibold">{m.shareWhatsApp()}</span>
                  <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />
                </a>
              )}
              {canSold && (
                <button type="button" className={row} onClick={() => setView("sold")}>
                  <span className={`${ic} text-st-sold`}><IconCheck /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14.5px] font-semibold">{m.iSoldIt()}</span>
                    <span className="block text-[12px] text-adm-fade truncate">{m.iSoldItSub()}</span>
                  </span>
                  <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />
                </button>
              )}
              {canDelete && (
                <button type="button" className={`${row} text-st-rejected`} onClick={() => setView("delete")}>
                  <span className={`${ic} text-st-rejected`}><IconTrash /></span>
                  <span className="flex-1 text-[14.5px] font-semibold">{m.requestDeleteBtn()}</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export default function SellerDashboard() {
  const locale = getLocale();
  const { seller, loading } = useSellerSession();
  const copy = useCopy();
  const products = useQuery(api.products.getBySeller, seller ? {} : "skip");
  const activeOffer = useQuery(api.offers.getActive);
  const stores = useQuery(api.stores.listMine, seller ? {} : "skip");
  const linkedStore = useQuery(api.stores.getLinked, seller ? {} : "skip");
  const [filter, setFilter] = useState("all");
  const [store, setStore] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [openId, setOpenId] = useState(null);

  const storeNames = useMemo(() => new Map((stores ?? []).map((st) => [st._id, st.name])), [stores]);
  const hasStores = (stores?.length ?? 0) > 0;

  // Sold units of a stocked product are listed under that product.
  const rows = useMemo(() => {
    if (!products) return [];
    const ids = new Set(products.map((p) => p._id));
    const units = new Map();
    for (const p of products) {
      if (p.soldFromId && ids.has(p.soldFromId)) units.set(p.soldFromId, [...(units.get(p.soldFromId) ?? []), p]);
    }
    return products
      .filter((p) => !(p.soldFromId && ids.has(p.soldFromId)))
      .map((p) => ({ ...p, units: (units.get(p._id) ?? []).sort((a, b) => (b.dateSold ?? "").localeCompare(a.dateSold ?? "")) }))
      .reverse();
  }, [products]);

  if (loading || !seller || products === undefined) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 w-40 bg-adm-sunk rounded-xl" />
        <div className="h-24 bg-adm-sunk rounded-2xl" />
        <div className="h-20 bg-adm-sunk rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[76px] bg-adm-sunk rounded-2xl" />)}
      </div>
    );
  }

  const own = products.filter((p) => !p.postedByManager);
  const rejected = own.filter((p) => p.status === "rejected");
  // Products on the "Our stock" fee deal (on their store, or on the seller
  // when there's no store) are the site's own sales: no fee for the seller to
  // pay, so they stay out of "needs attention" and the fee figures.
  const ownStockStores = new Set(
    [...(stores ?? []), ...(linkedStore ? [linkedStore] : [])].filter((st) => st.feeMode === "own").map((st) => st._id),
  );
  const isOwnStock = (p) => (p.storeId ? ownStockStores.has(p.storeId) : seller.feeMode === "own");
  const owed = products.filter((p) => p.status === "sold" && !isOwnStock(p));
  const feeOwed = owed.reduce((n, p) => n + (p.profit ?? 0), 0);
  const feePaid = products.filter((p) => p.status === "paid" && !isOwnStock(p)).reduce((n, p) => n + (p.profit ?? 0), 0);
  const month = new Date().toISOString().slice(0, 7);
  const soldThisMonth = products.filter((p) => (p.status === "sold" || p.status === "paid") && (p.dateSold ?? "").startsWith(month)).length;

  const inStore = (p, s) => s === "all" || (s === "none" ? !p.storeId : p.storeId === s);
  const storeRows = rows.filter((p) => inStore(p, store));
  // Status chip counts follow the chosen store.
  const counts = { all: storeRows.length };
  for (const p of storeRows) counts[p.status] = (counts[p.status] ?? 0) + 1;
  const visible = storeRows.filter((p) => filter === "all" || p.status === filter);
  const open = products.find((p) => p._id === openId) ?? null;
  const firstName = (seller.name || "").split(/\s+/)[0];
  // Numbers on the dashboard stay in English digits in every language.
  const n = (v) => formatNumberLocale(v, "en");

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-6">
      {activeOffer && <OfferTicker offer={activeOffer} />}

      <div>
        <h1 className="text-[21px] font-bold tracking-[-0.01em]">{m.sellerHello({ name: firstName })}</h1>
        {/* Browsers have no Kurdish date format, so the date shows in English and Arabic only. */}
        {locale !== "ckb" && <p className="text-[12.5px] text-adm-fade mt-0.5">{new Date().toLocaleDateString(locale === "ar" ? "ar-IQ" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>}
      </div>

      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] rtl:tracking-normal text-adm-fade mb-2">{m.needsAttention()}</p>
        <div className="space-y-2">
          {rejected.map((p) => (
            <div key={p._id} className="rounded-2xl bg-st-rejected-bg p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-adm-surface shrink-0">{p.photos?.[0] && <img {...photoProps(p.photos[0], 100)} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold truncate">{m.rejectedNotice({ title: p.title })}</p>
                {p.notes && <p className="text-[12.5px] font-semibold text-st-rejected line-clamp-2">{p.notes}</p>}
              </div>
              <Link to={`/seller/products/${p._id}/edit`} search={{ from: "rejection" }} className={`${btn("primary", "sm")} shrink-0`}>{m.fixBtn()}</Link>
            </div>
          ))}
          {feeOwed > 0 && (
            <div className="rounded-2xl bg-st-sold-bg p-3 space-y-2.5">
              <div>
                <p className="text-[14px] font-bold">{m.feesToPayTitle({ amount: formatNumberLocale(feeOwed, "en") })}</p>
                <p className="text-[12.5px] text-adm-soft">{m.feesFromSales({ count: formatNumberLocale(owed.length, "en") })}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-adm-surface p-2 ps-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-adm-fade">{m.payFeesVia()}</p>
                  <p className="text-[16px] font-bold tabular-nums"><span dir="ltr">{FEE_PAYMENT_NUMBER}</span></p>
                </div>
                <button type="button" onClick={() => copy(`‎${FEE_PAYMENT_NUMBER}`, m.numberCopied())} className={btn("outline", "sm")}>
                  <IconCopy className="w-4 h-4" /> {m.copyNumber()}
                </button>
              </div>
            </div>
          )}
          {!rejected.length && !feeOwed && (
            <div className="rounded-2xl bg-st-approved-bg p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-adm-surface text-st-approved grid place-items-center"><IconCheck /></span>
              <div>
                <p className="text-[14px] font-bold">{m.allGoodTitle()}</p>
                <p className="text-[12.5px] text-adm-soft">{m.allGoodSub()}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-3 rounded-2xl border border-adm-line bg-adm-surface overflow-hidden">
        {[[m.soldThisMonth(), n(soldThisMonth), ""], [m.feePending(), n(feeOwed), "text-st-sold"], [m.feePaid(), n(feePaid), "text-st-paid"]].map(([k, v, tone], i) => (
          <div key={k} className={`px-3 py-2.5 min-w-0 ${i ? "border-s border-adm-line" : ""}`}>
            <p className="text-[11px] font-semibold text-adm-fade truncate">{k}</p>
            <p className={`text-[17px] font-bold tabular-nums truncate ${tone}`}>{v}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[15px] font-bold flex-1">{m.sellerMyProducts()}</h2>
          {/* Only sellers with more than one store get a filter here (which store);
              everyone has the status chips below. */}
          {(stores?.length ?? 0) > 1 && (
            <StorePicker value={store} onChange={(v) => { setStore(v); setFilter("all"); }} stores={stores} n={n}
              countFor={(s) => rows.filter((p) => inStore(p, s)).length} />
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {FILTERS.filter((f) => f === "all" || counts[f]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-semibold whitespace-nowrap shrink-0 ${
                filter === f ? "bg-adm-accent-soft text-adm-accent border-adm-accent" : "bg-adm-surface text-adm-soft border-adm-line"}`}>
              {f === "all" ? m.categoryAll() : STATUS[f][0]()}<span className="text-[11px] opacity-70 tabular-nums">{n(counts[f] ?? 0)}</span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-adm-line bg-adm-surface py-12 text-center">
            <p className="text-[14px] text-adm-fade">{m.noSellerProducts()}</p>
            <Link to="/seller/add" className={`${btn("primary")} mt-3`}>{m.addFirstProduct()}</Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-[13px] text-adm-fade text-center py-10">{m.noProducts()}</p>
        ) : (
          <div className="mt-3 rounded-2xl border border-adm-line bg-adm-surface overflow-hidden divide-y divide-adm-line">
            {visible.map((p) => {
              const sold = p.units.length + (p.status === "sold" || p.status === "paid" ? 1 : 0);
              const left = p.status === "approved" || p.status === "deletion_requested" ? (p.stock ?? 1) : 0;
              return (
                <div key={p._id}>
                  <button type="button" onClick={() => setOpenId(p._id)} className="w-full flex items-center gap-3 px-3 py-3 text-start hover:bg-adm-sunk">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--color-sand)] shrink-0">
                      {p.photos?.[0] && <img {...photoProps(p.photos[p.mainPhotoIndex ?? 0] ?? p.photos[0], 160)} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{p.title}</p>
                      <p className="text-[13.5px] font-bold tabular-nums mt-0.5">{n(p.salePrice ?? p.price)} IQD</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-adm-fade min-w-0">
                        {p.seq && <span dir="ltr" className="font-mono">{p.seq}</span>}
                        {linkedStore && <span className="truncate">{m.profitLabel()} <b className="text-adm-soft tabular-nums">{n(p.profit ?? 0)}</b></span>}
                        {hasStores && p.storeId && storeNames.get(p.storeId) && <span className="truncate">· {storeNames.get(p.storeId)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Status status={p.status} />
                      {p.soldReportedAt && p.status === "approved" && <span className="text-[10.5px] font-bold text-st-sold">{m.soldReported()}</span>}
                    </div>
                  </button>
                  {(p.units.length > 0 || p.stock > 1) && (
                    <div className="px-3 pb-3">
                      <button type="button" disabled={!p.units.length} onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                        className="w-full flex items-center justify-between rounded-lg bg-adm-sunk px-3 py-2 text-[12px] font-semibold">
                        <span>{m.unitsSoldLeft({ sold: n(sold), left: n(left) })}</span>
                        {p.units.length > 0 && <IconChevron className={`w-4 h-4 text-adm-fade transition-transform ${expanded === p._id ? "rotate-90" : "rtl:rotate-180"}`} />}
                      </button>
                      {expanded === p._id && (
                        <div className="mt-1.5 space-y-1">
                          {p.units.map((u) => (
                            <div key={u._id} className="flex items-center gap-2 rounded-lg border border-adm-line px-3 py-2 text-[12.5px]">
                              <span className="text-adm-fade tabular-nums" dir="ltr">{u.dateSold?.slice(0, 10)}</span>
                              <span className="flex-1 font-bold tabular-nums">{n(u.salePrice ?? u.price)}</span>
                              <Status status={u.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {open && <ProductSheet product={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
