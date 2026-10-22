import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { tableProfit } from "@/convex/fees";
import { errorMessage } from "@/lib/errors";
import OfferTicker from "@/components/seller/OfferTicker";
import {
  PageHeader, Card, Panel, SectionTitle, ConfirmBox, AmountInput, Empty, Skeleton, btn, fmtIQD, inputCls, labelCls,
  useToast, IconPlus, IconTrash,
} from "@/components/admin/ui";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5);
const nice = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function stateOf(o) {
  if (!o.isActive) return "off";
  if (o.startDate > today()) return "scheduled";
  if (o.endDate < today()) return "ended";
  return "live";
}
const STATE = {
  live: ["Live", "text-st-approved bg-st-approved-bg"],
  scheduled: ["Scheduled", "text-st-sold bg-st-sold-bg"],
  ended: ["Ended", "text-adm-soft bg-adm-sunk"],
  off: ["Switched off", "text-st-rejected bg-st-rejected-bg"],
};
const feeText = (o) => (o.type === "free" ? "No service fee" : `Flat fee ${fmtIQD(o.flatFeeAmount)} IQD`);
const limitText = (o) => (o.maxPrice ? `Under ${fmtIQD(o.maxPrice)} IQD` : "Any price");

function sentence(d) {
  const fee = d.type === "free" ? "pay no service fee" : `pay a flat ${fmtIQD(d.flatFeeAmount || 0)} IQD fee`;
  const lim = d.maxPrice ? `on products under ${fmtIQD(d.maxPrice)} IQD` : "on every product";
  return `Sellers ${fee} ${lim} posted from ${nice(d.startDate)} to ${nice(d.endDate)}. The fee stays even if they edit the product later.`;
}

function OfferForm({ initial, editingId, offers, onClose }) {
  const create = useMutation(api.offers.create);
  const update = useMutation(api.offers.update);
  const toast = useToast();
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const len = d.startDate && d.endDate ? daysBetween(d.startDate, d.endDate) + 1 : 0;
  const clash = offers.find((o) => o._id !== editingId && o.isActive && o.startDate <= d.endDate && o.endDate >= d.startDate);
  const valid = d.title.trim() && d.startDate && d.endDate && len > 0 && (d.type === "free" || d.flatFeeAmount > 0) && !clash;

  async function save() {
    setBusy(true);
    const args = {
      title: d.title.trim(), description: d.description.trim(), type: d.type,
      flatFeeAmount: d.type === "flat_fee" ? d.flatFeeAmount : undefined,
      maxPrice: d.maxPrice || undefined, startDate: d.startDate, endDate: d.endDate,
    };
    try {
      if (editingId) { await update({ id: editingId, ...args }); toast("Offer saved"); }
      else { await create(args); toast(d.startDate > today() ? "Offer scheduled. Sellers notified" : "Offer started. Sellers notified"); }
      onClose();
    } catch (err) {
      toast(errorMessage(err, "Could not save the offer"), "error");
      setBusy(false);
    }
  }

  const chip = (on) => `h-9 px-3 rounded-full border text-[12.5px] font-semibold whitespace-nowrap ${on ? "bg-adm-ink text-adm-surface border-adm-ink" : "border-adm-line text-adm-soft bg-adm-surface"}`;
  const preset = [null, 50000, 100000, 200000];

  return (
    <Panel open onClose={onClose} title={editingId ? "Edit offer" : "New offer"}
      subtitle={<p className="text-[12px] text-adm-fade">{editingId ? "Products already posted keep this offer." : "Every active seller is notified."}</p>}
      footer={<>
        <button type="button" onClick={onClose} className={btn("outline", "lg")}>{m.adminCancel()}</button>
        <button type="button" onClick={save} disabled={!valid || busy} className={`${btn("primary", "lg")} flex-1`}>
          {editingId ? "Save offer" : d.startDate > today() ? "Schedule offer" : "Start offer"}
        </button>
      </>}>
      <div>
        <label htmlFor="o-title" className={labelCls}>Name sellers will see</label>
        <input id="o-title" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={m.adminOffersPlaceholderTitle()} className={inputCls} />
      </div>
      <div>
        <label htmlFor="o-desc" className={labelCls}>Short note for sellers (optional)</label>
        <input id="o-desc" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder={m.adminOffersPlaceholderDesc()} className={inputCls} />
      </div>

      <section>
        <SectionTitle>Fee</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[["free", m.adminOffersNoFeeLabel(), m.adminOffersNoFeeSub()], ["flat_fee", m.adminOffersFlatLabel(), m.adminOffersFlatSub()]].map(([v, t, sub]) => (
            <button key={v} type="button" onClick={() => set({ type: v, flatFeeAmount: v === "flat_fee" ? d.flatFeeAmount || 2000 : d.flatFeeAmount })} aria-pressed={d.type === v}
              className={`text-start rounded-2xl border-[1.5px] p-3 ${d.type === v ? "border-adm-accent bg-adm-accent-soft" : "border-adm-line bg-adm-surface"}`}>
              <span className="block text-[14px] font-bold">{t}</span>
              <span className="block text-[11.5px] text-adm-fade mt-0.5">{sub}</span>
            </button>
          ))}
        </div>
        {d.type === "flat_fee" && (
          <div className="mt-2"><label htmlFor="o-flat" className={labelCls}>{m.adminOffersFlatAmount()}</label><AmountInput id="o-flat" value={d.flatFeeAmount} onChange={(v) => set({ flatFeeAmount: v })} /></div>
        )}
      </section>

      <section>
        <SectionTitle>Which products</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {preset.map((v) => (
            <button key={v ?? "any"} type="button" onClick={() => set({ maxPrice: v, customMax: false })} className={chip(!d.customMax && (d.maxPrice ?? null) === v)}>
              {v ? `Under ${fmtIQD(v)}` : "Any price"}
            </button>
          ))}
          <button type="button" onClick={() => set({ customMax: true })} className={chip(d.customMax || (d.maxPrice && !preset.includes(d.maxPrice)))}>Other…</button>
        </div>
        {(d.customMax || (d.maxPrice && !preset.includes(d.maxPrice))) && (
          <div className="mt-2"><label htmlFor="o-max" className={labelCls}>{m.adminOffersMaxPrice()}</label><AmountInput id="o-max" value={d.maxPrice} onChange={(v) => set({ maxPrice: v || null })} /></div>
        )}
      </section>

      <section>
        <SectionTitle>When</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <div><label htmlFor="o-start" className={labelCls}>Starts</label><input id="o-start" type="date" dir="ltr" value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} /></div>
          <div><label htmlFor="o-end" className={labelCls}>Ends (end of that day)</label><input id="o-end" type="date" dir="ltr" value={d.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputCls} /></div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[[7, "1 week"], [14, "2 weeks"], [30, "1 month"]].map(([n, label]) => (
            <button key={n} type="button" onClick={() => set({ endDate: addDays(d.startDate || today(), n - 1) })} className={chip(len === n)}>{label}</button>
          ))}
        </div>
      </section>

      <div className="rounded-2xl bg-adm-ink text-adm-surface px-4 py-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] opacity-60 mb-1">In plain words</p>
        <p className="text-[13.5px] leading-relaxed">{len > 0 ? sentence(d) : "The end date is before the start date."}</p>
      </div>
      {clash && (
        <p className="rounded-2xl bg-st-pending-bg text-st-pending px-4 py-3 text-[12.5px] font-semibold">
          Overlaps "{clash.title}" ({nice(clash.startDate)} – {nice(clash.endDate)}). Only one offer can run at a time; change the dates or switch that one off.
        </p>
      )}

      <section>
        <SectionTitle>What sellers will see</SectionTitle>
        <OfferTicker offer={{ title: d.title || "Your offer name", description: d.description, type: d.type, flatFeeAmount: d.flatFeeAmount, maxPrice: d.maxPrice || undefined, endDate: d.endDate || today() }} />
      </section>
    </Panel>
  );
}

function OfferRow({ offer: o, results, onEdit, onReuse }) {
  const deactivate = useMutation(api.offers.deactivate);
  const reactivate = useMutation(api.offers.reactivate);
  const remove = useMutation(api.offers.deleteOffer);
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const s = stateOf(o);
  const run = async (fn, done) => { try { await fn(); toast(done); } catch (err) { toast(errorMessage(err, "Something went wrong"), "error"); } };

  return (
    <div className="px-3.5 py-3 lg:px-4 space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold">{o.title}</span>
            <span className={`h-[22px] px-2 rounded-full text-[11px] font-bold inline-flex items-center ${STATE[s][1]}`}>{STATE[s][0]}</span>
          </div>
          <p className="text-[12px] text-adm-fade mt-1">{feeText(o)} · {limitText(o)} · {nice(o.startDate)} – {nice(o.endDate)}</p>
          <p className="text-[12px] text-adm-soft mt-0.5">
            {s === "scheduled" ? `Starts in ${daysBetween(today(), o.startDate)} days` : <><b className="text-adm-ink tabular-nums">{results.posted}</b> posted · <b className="text-adm-ink tabular-nums">{fmtIQD(results.waived)}</b> IQD waived</>}
          </p>
        </div>
      </div>
      {confirm ? (
        <ConfirmBox title="Delete this offer?" text="It disappears from the list. Products posted with it keep their fee." confirmLabel="Delete offer"
          onCancel={() => setConfirm(false)} onConfirm={() => run(() => remove({ id: o._id }), "Offer deleted")} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {(s === "scheduled" || s === "live") && <button type="button" onClick={onEdit} className={btn("outline", "sm")}>Edit</button>}
          {(s === "ended" || s === "off") && <button type="button" onClick={onReuse} className={btn("outline", "sm")}>Run again</button>}
          {o.isActive && s !== "ended" && <button type="button" onClick={() => run(() => deactivate({ id: o._id }), "Switched off")} className={btn("outline", "sm")}>Switch off</button>}
          {!o.isActive && o.endDate >= today() && <button type="button" onClick={() => run(() => reactivate({ id: o._id }), "Switched on")} className={btn("outline", "sm")}>Switch on</button>}
          <button type="button" onClick={() => setConfirm(true)} aria-label="Delete offer" className={`${btn("ghost", "sm")} ms-auto`}><IconTrash className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

export default function AdminOffersPage() {
  const offers = useQuery(api.offers.getAll);
  const products = useQuery(api.products.getAll);
  const update = useMutation(api.offers.update);
  const deactivate = useMutation(api.offers.deactivate);
  const toast = useToast();
  const [form, setForm] = useState(null); // { initial, editingId }
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Results per offer: products posted with it, sellers, and fees not charged.
  const results = useMemo(() => {
    const r = {};
    for (const p of products ?? []) {
      if (!p.offerId) continue;
      const x = (r[p.offerId] ??= { posted: 0, sellers: new Set(), waived: 0 });
      x.posted++;
      x.sellers.add(p.sellerId);
      x.waived += Math.max(0, tableProfit(p.salePrice ?? p.price) - (p.profit ?? 0));
    }
    return r;
  }, [products]);
  const res = (id) => results[id] ?? { posted: 0, sellers: new Set(), waived: 0 };

  if (!offers || !products) return <Skeleton rows={4} />;
  const live = offers.find((o) => stateOf(o) === "live");
  const rest = offers.filter((o) => o !== live).sort((a, b) => b.startDate.localeCompare(a.startDate));

  const blank = () => ({ title: "", description: "", type: "free", flatFeeAmount: 2000, maxPrice: 100000, startDate: today(), endDate: addDays(today(), 13) });
  const fromOffer = (o, keepDates) => ({
    title: o.title, description: o.description ?? "", type: o.type, flatFeeAmount: o.flatFeeAmount ?? 2000, maxPrice: o.maxPrice ?? null,
    startDate: keepDates ? o.startDate : today(),
    endDate: keepDates ? o.endDate : addDays(today(), daysBetween(o.startDate, o.endDate)),
  });

  async function extend(o) {
    try {
      await update({ id: o._id, title: o.title, description: o.description ?? "", type: o.type, flatFeeAmount: o.flatFeeAmount, maxPrice: o.maxPrice, startDate: o.startDate, endDate: addDays(o.endDate, 7) });
      toast(`Extended to ${nice(addDays(o.endDate, 7))}`);
    } catch (err) { toast(errorMessage(err, "Could not extend"), "error"); }
  }

  let hero;
  if (live) {
    const total = daysBetween(live.startDate, live.endDate) + 1;
    const gone = daysBetween(live.startDate, today());
    const r = res(live._id);
    hero = (
      <Card className="p-4 space-y-4 mb-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-st-approved">
              <span className="w-2 h-2 rounded-full bg-current shadow-[0_0_0_4px_var(--a-green-bg)]" /> Live now
            </span>
            <h2 className="text-[19px] font-bold mt-1">{live.title}</h2>
            {live.description && <p className="text-[13px] text-adm-soft mt-0.5">{live.description}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[12px] font-semibold px-2 py-1 rounded-lg bg-adm-accent-soft text-adm-accent">{feeText(live)}</span>
              <span className="text-[12px] font-semibold px-2 py-1 rounded-lg bg-adm-sunk text-adm-soft">{limitText(live)}</span>
              <span className="text-[12px] font-semibold px-2 py-1 rounded-lg bg-adm-sunk text-adm-soft">{nice(live.startDate)} – {nice(live.endDate)}</span>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[22px] font-bold tabular-nums">{total - gone} days</p>
            <p className="text-[12px] text-adm-fade">left · ends end of {nice(live.endDate)}</p>
          </div>
        </div>
        <div>
          <div className="h-1.5 rounded-full bg-adm-sunk overflow-hidden"><div className="h-full bg-adm-accent rounded-full" style={{ width: `${Math.min(100, ((gone + 1) / total) * 100)}%` }} /></div>
          <p className="text-[11.5px] text-adm-fade mt-1 tabular-nums">Day {gone + 1} of {total}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Posted with it", res(live._id).posted], ["Sellers", r.sellers.size], ["Fees waived", fmtIQD(r.waived)]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-adm-sunk px-3 py-2.5 min-w-0">
              <p className="text-[11px] text-adm-fade font-semibold truncate">{k}</p>
              <p className="text-[16px] font-bold tabular-nums truncate" dir="ltr">{v}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-adm-fade mb-2">What sellers see on their dashboard</p>
          <OfferTicker offer={live} />
        </div>
        {confirmEnd ? (
          <ConfirmBox title="End the offer now?" text="New products pay the normal fee from now on. Products already posted keep the offer fee." confirmLabel="End offer"
            onCancel={() => setConfirmEnd(false)}
            onConfirm={async () => { try { await deactivate({ id: live._id }); toast("Offer ended"); } catch (err) { toast(errorMessage(err, "Could not end"), "error"); } setConfirmEnd(false); }} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => extend(live)} className={btn("outline")}>Extend 7 days</button>
            <button type="button" onClick={() => setForm({ initial: fromOffer(live, true), editingId: live._id })} className={btn("outline")}>Edit</button>
            <button type="button" onClick={() => setConfirmEnd(true)} className={`${btn("ghost")} text-st-rejected`}>End now</button>
          </div>
        )}
      </Card>
    );
  } else {
    hero = (
      <Card className="p-6 mb-5 text-center space-y-3">
        <p className="text-[14px] text-adm-soft">{m.adminOffersNoActive()} Sellers pay the normal fee.</p>
        <button type="button" onClick={() => setForm({ initial: blank() })} className={btn("primary")}><IconPlus className="w-4 h-4" /> Start an offer</button>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title={m.adminOffers()} sub="Lower or no service fee for a set time"
        actions={<button type="button" onClick={() => setForm({ initial: blank() })} className={btn("primary")}><IconPlus className="w-4 h-4" /> New offer</button>} />
      {hero}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[14px] font-bold">Planned and past offers</h2>
        <span className="text-[12px] text-adm-fade">{rest.length}</span>
      </div>
      <div className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden divide-y divide-adm-line">
        {rest.length === 0 && <Empty>No other offers yet.</Empty>}
        {rest.map((o) => (
          <OfferRow key={o._id} offer={o} results={res(o._id)}
            onEdit={() => setForm({ initial: fromOffer(o, true), editingId: o._id })}
            onReuse={() => setForm({ initial: fromOffer(o, false) })} />
        ))}
      </div>
      {form && <OfferForm initial={form.initial} editingId={form.editingId} offers={offers} onClose={() => setForm(null)} />}
    </div>
  );
}
