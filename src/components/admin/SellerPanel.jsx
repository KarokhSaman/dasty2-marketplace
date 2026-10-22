import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { errorMessage } from "@/lib/errors";
import SellerStores from "@/components/admin/SellerStores";
import ProductRow, { RowList } from "@/components/admin/ProductRow";
import {
  Panel, Avatar, SectionTitle, Segmented, Switch, ConfirmBox, AmountInput, btn, fmtIQD, inputCls, labelCls,
  useToast, useCopy, waLink, ltrPhone, IconWhatsApp, IconCopy,
} from "@/components/admin/ui";

export function feeDeal(s) {
  if (s.feeMode === "flat") return `Flat ${fmtIQD(s.feeValue)} IQD`;
  if (s.feeMode === "percentage") return `${s.feeValue}% of price`;
  if (s.feeMode === "none") return "No service fee";
  return "Normal price table";
}

const MODES = [
  { value: "default", label: "Normal" },
  { value: "none", label: "No fee" },
  { value: "flat", label: "Flat" },
  { value: "percentage", label: "%" },
];

// Everything about one seller: contact, what they owe, their fee deal, stores,
// products and account settings.
export default function SellerPanel({ seller: s, products, sellers, stores, onClose, onOpenProduct }) {
  const setActive = useMutation(api.users.setActive);
  const setRole = useMutation(api.users.setRole);
  const deleteSeller = useMutation(api.users.deleteSeller);
  const setFeeArrangement = useMutation(api.users.setFeeArrangement);
  const createLog = useMutation(api.adminLogs.create);
  const toast = useToast();
  const copy = useCopy();

  const [mode, setMode] = useState(s.feeMode ?? "default");
  const [value, setValue] = useState(s.feeValue ?? 0);
  const [confirm, setConfirm] = useState(null); // "deactivate" | "admin" | "delete"
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMode(s.feeMode ?? "default"); setValue(s.feeValue ?? 0); setConfirm(null); }, [s._id, s.feeMode, s.feeValue]);

  const mine = products.filter((p) => p.sellerId === s._id).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
  const by = (st) => mine.filter((p) => p.status === st);
  const owes = by("sold").reduce((t, p) => t + (p.profit ?? 0), 0);
  const earned = by("paid").reduce((t, p) => t + (p.profit ?? 0), 0);
  const feeChanged = mode !== (s.feeMode ?? "default") || ((mode === "flat" || mode === "percentage") && value !== (s.feeValue ?? 0));

  async function run(fn, done) {
    setBusy(true);
    try { await fn(); if (done) toast(done); setConfirm(null); }
    catch (err) { toast(errorMessage(err, "Something went wrong"), "error"); }
    finally { setBusy(false); }
  }

  const saveFee = () => run(async () => {
    const needs = mode === "flat" || mode === "percentage";
    await setFeeArrangement({ id: s._id, feeMode: mode, feeValue: needs ? value : undefined });
    await createLog({ action: "seller_fee_changed", sellerName: s.name, notes: feeDeal({ feeMode: mode, feeValue: value }) });
  }, "Fee deal saved");

  const toggleActive = (next) => run(async () => {
    await setActive({ id: s._id, isActive: next });
    await createLog({ action: next ? "seller_activated" : "seller_deactivated", sellerName: s.name, notes: s.email || undefined });
  }, next ? "Seller active" : "Seller deactivated");

  const stat = (label, val, tone = "") => (
    <div className="rounded-xl bg-adm-sunk px-3 py-2.5 min-w-0">
      <p className="text-[11px] text-adm-fade font-semibold">{label}</p>
      <p className={`text-[16px] font-bold tabular-nums truncate ${tone}`} dir="ltr">{val}</p>
    </div>
  );

  return (
    <Panel open onClose={onClose} wide
      leading={<Avatar name={s.name} size={44} />}
      title={s.name || "Unnamed"}
      subtitle={<p className="text-[12.5px] text-adm-soft"><span dir="ltr" className="tabular-nums">{s.phone}</span>{s.city ? ` · ${s.city}` : ""}</p>}>

      {s.phone && (
        <div className="grid grid-cols-2 gap-2">
          <a href={waLink(s.phone)} target="_blank" rel="noopener noreferrer" className={btn("wa", "lg")}><IconWhatsApp className="w-[18px] h-[18px]" /> WhatsApp</a>
          <button type="button" onClick={() => copy(ltrPhone(s.phone), "Number copied")} className={btn("outline", "lg")}><IconCopy className="w-[18px] h-[18px]" /> {m.copyNumber()}</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stat(m.statusApproved(), by("approved").length)}
        {stat(m.statusPending(), by("pending").length)}
        {stat("Owes", fmtIQD(owes), owes ? "text-st-sold" : "")}
        {stat("Fees paid", fmtIQD(earned))}
      </div>
      {owes > 0 && (
        <Link to="/admin/fees" onClick={onClose} className={`${btn("outline")} w-full`}>Collect {fmtIQD(owes)} IQD in Fees to collect →</Link>
      )}

      <section>
        <SectionTitle>Service fee deal</SectionTitle>
        <Segmented value={mode} onChange={(v) => { setMode(v); if (v === "flat" && !value) setValue(2000); if (v === "percentage" && (!value || value > 100)) setValue(5); }} options={MODES} />
        {mode === "flat" && (
          <div className="mt-2"><label htmlFor="fee-flat" className={labelCls}>Flat fee per sale (IQD)</label><AmountInput id="fee-flat" value={value} onChange={setValue} /></div>
        )}
        {mode === "percentage" && (
          <div className="mt-2">
            <label htmlFor="fee-pct" className={labelCls}>Percent of the sale price</label>
            <input id="fee-pct" type="number" inputMode="decimal" min="1" max="100" dir="ltr" value={value || ""} onChange={(e) => setValue(Number(e.target.value))} className={inputCls} />
          </div>
        )}
        <p className="text-[11.5px] text-adm-fade mt-1.5">
          {mode === "default" ? "Uses the price table, and offers apply." : "Replaces the price table and offers for this seller."} Applies to products added or edited from now on.
        </p>
        {feeChanged && (
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={busy} onClick={saveFee} className={`${btn("dark")} flex-1`}>Save fee deal</button>
            <button type="button" onClick={() => { setMode(s.feeMode ?? "default"); setValue(s.feeValue ?? 0); }} className={`${btn("outline")} flex-1`}>{m.adminCancel()}</button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-adm-line bg-adm-surface p-3.5">
        <SellerStores seller={s} sellers={sellers} stores={stores.filter((st) => st.sellerId === s._id)} />
      </section>

      <section>
        <SectionTitle action={mine.length > 5 && (
          <Link to="/admin/products" search={{ tab: "all", sellerId: s._id }} onClick={onClose} className="text-[12.5px] font-semibold text-adm-accent">See all {mine.length}</Link>
        )}>{m.adminProducts()} · {mine.length}</SectionTitle>
        {mine.length ? (
          <RowList>{mine.slice(0, 5).map((p) => <ProductRow key={p._id} product={p} onOpen={(x) => onOpenProduct(x._id)} />)}</RowList>
        ) : <p className="text-[13px] text-adm-fade">No products yet.</p>}
      </section>

      <section className="space-y-2">
        <SectionTitle>Account</SectionTitle>
        <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {s.email && <><span className="text-adm-fade">Email</span><span className="truncate" dir="ltr">{s.email}</span></>}
          {(s.city || s.address) && <><span className="text-adm-fade">Address</span><span>{[s.city, s.address].filter(Boolean).join(", ")}</span></>}
          {s.registeredAt && <><span className="text-adm-fade">Joined</span><span>{new Date(s.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></>}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-adm-line bg-adm-surface p-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold">{s.isActive ? m.adminActive() : m.adminInactive()}</p>
            <p className="text-[12px] text-adm-fade">Inactive sellers' products are hidden from the site.</p>
          </div>
          <Switch checked={s.isActive} label="Active" disabled={busy} onChange={(v) => (v ? toggleActive(true) : setConfirm("deactivate"))} />
        </div>
        {confirm === "deactivate" && (
          <ConfirmBox title={`Deactivate ${s.name}?`} text="Their products are hidden and they can't sign in to sell until you turn this back on." confirmLabel={m.adminDeactivate()} busy={busy}
            onCancel={() => setConfirm(null)} onConfirm={() => toggleActive(false)} />
        )}
        {confirm === "admin" ? (
          <ConfirmBox tone="neutral" title="Make this seller an admin?" text="They lose seller access and can only use the admin pages." confirmLabel="Make admin" busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={() => run(async () => { await setRole({ id: s._id, role: "admin" }); await createLog({ action: "seller_promoted_to_admin", sellerName: s.name, notes: s.email || undefined }); onClose(); }, "Now an admin")} />
        ) : confirm === "delete" ? (
          <ConfirmBox title={`Delete ${s.name}?`} text={`This deletes the account, its ${mine.length} products, notifications and stores. It can't be undone.`} confirmLabel="Delete seller" busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={() => run(async () => { await deleteSeller({ id: s._id }); await createLog({ action: "seller_deleted", sellerName: s.name, notes: s.email || undefined }); onClose(); }, "Seller deleted")} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm("admin")} className={btn("outline")}>Make admin</button>
            <button type="button" onClick={() => setConfirm("delete")} className={btn("danger")}>Delete seller</button>
          </div>
        )}
      </section>
    </Panel>
  );
}
