import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { errorMessage } from "@/lib/errors";
import ProductPanel from "@/components/admin/ProductPanel";
import { useProductActions } from "@/components/admin/useProductActions";
import {
  PageHeader, Card, Avatar, Code, ConfirmBox, Empty, Skeleton, btn, fmtIQD, useToast, useCopy, waLink,
  IconWhatsApp, IconCopy, IconCheck,
} from "@/components/admin/ui";

// Where sellers send their service fees (Super Qi, FIB or FastPay).
const FEE_PAYMENT_NUMBER = "07724944244";

// Invisible left-to-right marks keep codes, English titles and numbers in
// order when the message is read in Kurdish or Arabic.
const LRM = "\u200E";

// The reminder is always in Kurdish, whatever language the admin page is in,
// since that is what sellers read.
const REMINDER_LOCALE = { locale: "ckb" };

function reminder(group) {
  return [
    m.feesWaGreeting({}, REMINDER_LOCALE),
    "",
    m.feesWaIntro({}, REMINDER_LOCALE),
    m.feesWaTotal({ total: fmtIQD(group.total) }, REMINDER_LOCALE),
    "",
    m.feesWaPay({ number: `${LRM}${FEE_PAYMENT_NUMBER}` }, REMINDER_LOCALE),
  ].join("\n");
}

function SellerFees({ group, onOpen }) {
  const actions = useProductActions();
  const toast = useToast();
  const copy = useCopy();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const text = reminder(group);

  async function payAll() {
    setBusy(true);
    let ok = 0;
    try {
      for (const p of group.items) { await actions.markPaid(p); ok++; }
      toast(`${group.name}: ${ok} marked paid`);
    } catch (err) {
      toast(`${ok} marked paid. ${errorMessage(err, "Then something went wrong")}`, "error");
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
          <p className="text-[12.5px] text-adm-soft tabular-nums" dir="ltr">{group.phone}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade">Owes</p>
          <p className="text-[19px] font-bold text-st-sold tabular-nums" dir="ltr">{fmtIQD(group.total)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {group.items.map((p) => (
          <button key={p._id} type="button" onClick={() => onOpen(p._id)}
            className="w-full flex items-center gap-2.5 rounded-xl bg-adm-sunk px-3 py-2 text-start text-[12.5px] hover:bg-adm-line/60">
            {p.seq && <Code>{p.seq}</Code>}
            <span className="flex-1 min-w-0 truncate">{p.title}</span>
            <span className="text-adm-soft tabular-nums max-sm:hidden" dir="ltr">{fmtIQD(p.salePrice ?? p.price)}</span>
            <span className="font-bold text-adm-accent tabular-nums" dir="ltr">{fmtIQD(p.profit)}</span>
          </button>
        ))}
      </div>

      {showMsg && (
        <div className="rounded-2xl rounded-es-md bg-st-approved-bg px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-line">{text}</div>
      )}

      {confirm ? (
        <ConfirmBox tone="neutral" busy={busy} title={`Mark all ${group.items.length} paid?`}
          text={`Do this once ${group.name} has paid ${fmtIQD(group.total)} IQD. Each sale moves to Paid and the seller is notified.`}
          confirmLabel="Mark all paid" onConfirm={payAll} onCancel={() => setConfirm(false)} />
      ) : (
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
          {group.phone ? (
            <a href={waLink(group.phone, text)} target="_blank" rel="noopener noreferrer" className={`${btn("wa")} lg:flex-none`}>
              <IconWhatsApp className="w-4 h-4" /> Send reminder
            </a>
          ) : null}
          <button type="button" onClick={() => copy(text, "Message copied")} className={btn("outline")}><IconCopy className="w-4 h-4" /> Copy message</button>
          <button type="button" onClick={() => setShowMsg((v) => !v)} className={`${btn("ghost")} max-lg:hidden`}>{showMsg ? "Hide message" : "See message"}</button>
          <button type="button" onClick={() => setConfirm(true)} className={`${btn("dark")} col-span-2 lg:ms-auto`}>
            <IconCheck className="w-4 h-4" /> Mark all {group.items.length} paid
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
      const g = map.get(p.sellerId) ?? { id: p.sellerId, name: p.sellerName, phone: p.sellerPhone, items: [], total: 0 };
      g.items.push(p);
      g.total += p.profit ?? 0;
      map.set(p.sellerId, g);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
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
        <div className="grid gap-3 xl:grid-cols-2">
          {groups.map((g) => <SellerFees key={g.id} group={g} onOpen={setOpenId} />)}
        </div>
      )}
      {open && <ProductPanel product={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
