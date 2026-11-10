import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getLocale } from "@/paraglide/runtime";
import { feeReminderMessage } from "@/components/admin/feeReminderMessage";
import { errorMessage } from "@/lib/errors";
import ProductPanel from "@/components/admin/ProductPanel";
import WaText from "@/components/admin/WaText";
import { photoProps } from "@/lib/images";
import { useProductActions } from "@/components/admin/useProductActions";
import {
  PageHeader, Card, Avatar, Code, ConfirmBox, Empty, Skeleton, Panel, btn, fmtIQD, useToast, useCopy, waLink, fmtPhone,
  IconWhatsApp, IconCopy, IconCheck, IconChevron,
} from "@/components/admin/ui";

const receiptDate = (at) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function SellerFees({ group, onOpen }) {
  const actions = useProductActions();
  const toast = useToast();
  const copy = useCopy();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [viewing, setViewing] = useState(false);
  // The sales being marked paid. With a receipt nothing starts ticked: the
  // admin picks the sales it pays for. Without one, all start ticked.
  const [picked, setPicked] = useState(() => new Set(group.receipt ? [] : group.items.map((p) => p._id)));
  const chosen = group.items.filter((p) => picked.has(p._id));
  const chosenTotal = chosen.reduce((s, p) => s + (p.profit ?? 0), 0);
  const left = group.items.length - chosen.length;
  const allPicked = left === 0;
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const text = feeReminderMessage(fmtIQD(group.total), group.items.map((p) => ({ code: p.seq, fee: fmtIQD(p.profit) })));

  async function payChosen() {
    setBusy(true);
    try {
      await actions.markFeesPaid(chosen);
      toast(`${group.name}: ${chosen.length} marked paid`);
      setPicked(new Set());
    } catch (err) {
      toast(errorMessage(err, "Could not mark them paid"), "error");
    } finally {
      setBusy(false); setConfirm(false);
    }
  }

  return (
    <Card className="p-3.5 lg:p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={group.name} size={42} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate">{group.name}</p>
          <p className="text-[12.5px] text-adm-soft tabular-nums" dir="ltr">{fmtPhone(group.phone)}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade">Owes</p>
          <p className="text-[19px] font-bold text-st-sold tabular-nums" dir="ltr">{fmtIQD(group.total)}</p>
        </div>
      </div>

      {group.receipt && (
        <button type="button" onClick={() => setViewing(true)} className="w-full flex items-center gap-3 rounded-xl bg-st-approved-bg p-2 ps-3 text-start">
          <img {...photoProps(group.receipt.url, 140)} alt="Payment receipt" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-st-approved">Receipt uploaded — confirm the payment</p>
            <p className="text-[11.5px] text-adm-soft">Tap to view · {receiptDate(group.receipt.at)}</p>
          </div>
          <IconChevron className="w-4 h-4 text-adm-fade shrink-0 rtl:rotate-180" />
        </button>
      )}
      <Panel open={viewing} onClose={() => setViewing(false)} title="Payment receipt" short
        subtitle={group.receipt && <p className="text-[12px] text-adm-soft">{group.name} · {receiptDate(group.receipt.at)}</p>}>
        {group.receipt && <img src={group.receipt.url} alt="Payment receipt" className="w-full rounded-xl border border-adm-line" />}
        <p className="text-[12px] text-adm-fade">Tick the sales it pays for, then Mark paid. It comes off any sale you leave unticked, which still owes.</p>
      </Panel>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[12px]">
          <p className={`flex-1 min-w-0 ${group.receipt && !chosen.length ? "font-semibold text-st-approved" : "text-adm-fade"}`}>
            {group.receipt && !chosen.length ? "Tick the sales this receipt pays for" : `${chosen.length} of ${group.items.length} ticked`}
          </p>
          <button type="button" onClick={() => setPicked(new Set(allPicked ? [] : group.items.map((p) => p._id)))} className="font-semibold text-adm-accent shrink-0">
            {allPicked ? "Untick all" : "Tick all"}
          </button>
        </div>
        {group.items.map((p) => {
          const on = picked.has(p._id);
          return (
            <div key={p._id} className={`flex items-center rounded-xl ${on ? "bg-adm-accent-soft" : "bg-adm-sunk"}`}>
              <button type="button" role="checkbox" aria-checked={on} aria-label={`Paid: ${p.title}`} onClick={() => toggle(p._id)}
                className="w-10 self-stretch grid place-items-center shrink-0">
                <span className={`w-5 h-5 rounded-md grid place-items-center border-[1.5px] ${on ? "bg-adm-accent border-adm-accent text-white" : "border-adm-fade bg-adm-surface"}`}>
                  {on && <IconCheck className="w-3.5 h-3.5" />}
                </span>
              </button>
              <button type="button" onClick={() => onOpen(p._id)}
                className="flex-1 min-w-0 flex items-center gap-2.5 pe-3 py-2 text-start text-[12.5px]">
                {p.seq && <Code>{p.seq}</Code>}
                <span className="flex-1 min-w-0 truncate">{p.title}</span>
                <span className="text-adm-soft tabular-nums max-sm:hidden" dir="ltr">{fmtIQD(p.salePrice ?? p.price)}</span>
                <span className="font-bold text-adm-accent tabular-nums" dir="ltr">{fmtIQD(p.profit)}</span>
              </button>
            </div>
          );
        })}
      </div>

      {showMsg && (
        <div dir={getLocale() === "en" ? "rtl" : undefined} className="rounded-2xl rounded-es-md bg-st-approved-bg px-3.5 py-3 text-[13px] leading-relaxed"><WaText text={text} /></div>
      )}

      {confirm ? (
        <ConfirmBox tone="neutral" busy={busy} title={allPicked ? `Mark all ${chosen.length} paid?` : `Mark ${chosen.length} of ${group.items.length} paid?`}
          text={`Do this once ${group.name} has paid ${fmtIQD(chosenTotal)} IQD. Each ticked sale moves to Paid and the seller is notified.${
            group.receipt && left ? ` The receipt comes off the other ${left}, which still owe.` : ""}`}
          confirmLabel={`Mark ${chosen.length} paid`} onConfirm={payChosen} onCancel={() => setConfirm(false)} />
      ) : (
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
          {group.phone && !group.receipt ? (
            <a href={waLink(group.phone, text)} target="_blank" rel="noopener noreferrer" className={`${btn("wa")} lg:flex-none`}>
              <IconWhatsApp className="w-4 h-4" /> Send reminder
            </a>
          ) : null}
          <button type="button" onClick={() => copy(text, "Message copied")} className={btn("outline")}><IconCopy className="w-4 h-4" /> Copy message</button>
          <button type="button" onClick={() => setShowMsg((v) => !v)} className={`${btn("ghost")} max-lg:hidden`}>{showMsg ? "Hide message" : "See message"}</button>
          <button type="button" disabled={!chosen.length} onClick={() => setConfirm(true)} className={`${btn("dark")} col-span-2 lg:ms-auto`}>
            <IconCheck className="w-4 h-4" />
            {!chosen.length ? "Tick sales to mark paid" : `${allPicked ? "Mark all" : "Mark"} ${chosen.length} paid · ${fmtIQD(chosenTotal)}`}
          </button>
        </div>
      )}
    </Card>
  );
}

// Sold items whose service fee hasn't been collected yet, grouped by seller,
// with a ready reminder for WhatsApp.
export default function AdminFeesPage() {
  const products = useQuery(api.products.getAll);
  const [openId, setOpenId] = useState(null);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of products ?? []) {
      if (p.status !== "sold") continue;
      const g = map.get(p.sellerId) ?? { id: p.sellerId, name: p.sellerName, phone: p.sellerPhone, items: [], total: 0, receipt: null };
      g.items.push(p);
      g.total += p.profit ?? 0;
      if (p.feeReceiptUrl && (!g.receipt || (p.feeReceiptAt ?? "") > g.receipt.at)) g.receipt = { url: p.feeReceiptUrl, at: p.feeReceiptAt ?? "" };
      map.set(p.sellerId, g);
    }
    // Sellers who sent a receipt first — they only need a tap to confirm.
    return [...map.values()].sort((a, b) => (b.receipt ? 1 : 0) - (a.receipt ? 1 : 0) || b.total - a.total);
  }, [products]);

  if (!products) return <Skeleton rows={4} />;
  const total = groups.reduce((s, g) => s + g.total, 0);
  const open = products.find((p) => p._id === openId) ?? null;

  return (
    <div>
      <PageHeader title="Fees to collect" sub={groups.length ? `${fmtIQD(total)} IQD from ${groups.length} seller${groups.length === 1 ? "" : "s"}` : "Nothing owed right now"} />
      {groups.length === 0 ? (
        <Card><Empty>Every fee is collected. Sold items show up here until they are marked paid.</Empty></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {groups.map((g) => <SellerFees key={g.id} group={g} onOpen={setOpenId} />)}
        </div>
      )}
      {open && <ProductPanel product={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
