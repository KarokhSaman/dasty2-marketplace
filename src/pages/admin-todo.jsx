import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import ProductRow, { RowList } from "@/components/admin/ProductRow";
import ProductPanel from "@/components/admin/ProductPanel";
import ReviewMode from "@/components/admin/ReviewMode";
import ConnectBuyer from "@/components/admin/ConnectBuyer";
import { soldFollowUpMessage, stillForSaleMessage } from "@/components/admin/buyerMessages";
import { useProductActions } from "@/components/admin/useProductActions";
import { PageHeader, Empty, Skeleton, Code, Thumb, btn, fmtIQD, useToast, waLink, IconCheck, IconWhatsApp } from "@/components/admin/ui";

// A live post nobody has approved or confirmed with the seller for this long
// is checked with the seller.
const STALE_DAYS = 28;
const DAY = 86400000;
const ago = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

// A follow-up row: the product, why it is here, and its quick actions.
function FollowRow({ product: p, note, onOpen, children }) {
  return (
    <div className="flex gap-3 items-start rounded-2xl border border-adm-line bg-adm-surface p-2.5 mb-2">
      <button type="button" onClick={() => onOpen(p)} className="shrink-0"><Thumb src={p.photos?.[p.mainPhotoIndex ?? 0]} size={52} /></button>
      <div className="flex-1 min-w-0">
        <button type="button" onClick={() => onOpen(p)} className="block text-start w-full">
          <span className="block text-[13.5px] font-semibold truncate" dir="auto">{p.title}</span>
          <span className="flex items-center gap-1.5 text-[11.5px] text-adm-soft"><Code>{p.seq}</Code> {note}</span>
        </button>
        <div className="flex flex-wrap gap-1.5 mt-1.5">{children}</div>
      </div>
    </div>
  );
}

function Group({ id, title, count, action, children }) {
  return (
    <section id={id} className="mb-6 scroll-mt-20">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[14px] font-bold">{title}</h2>
        <span className="text-[12px] text-adm-fade tabular-nums">{count}</span>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// Admin start page: only what needs someone today, most urgent first: new
// products to review, delete requests, buyer follow-ups, sold items whose fee
// hasn't been collected, and live posts to check are still for sale.
export default function AdminTodoPage() {
  const products = useQuery(api.products.getAll);
  const sellers = useQuery(api.users.getAll);
  const [openId, setOpenId] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const snooze = useMutation(api.leads.snoozeFollowUp);
  const confirmAvailable = useMutation(api.leads.confirmAvailable);
  const actions = useProductActions();
  const toast = useToast();

  const data = useMemo(() => {
    const all = products ?? [];
    const by = (s) => all.filter((p) => p.status === s);
    const sold = by("sold").sort((a, b) => (b.dateSold ?? "").localeCompare(a.dateSold ?? ""));
    return {
      pending: by("pending").sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)),
      deletes: by("deletion_requested"),
      sold,
      owed: sold.reduce((s, p) => s + (p.profit ?? 0), 0),
      owing: new Set(sold.map((p) => p.sellerId)).size,
      earned: by("paid").reduce((s, p) => s + (p.profit ?? 0), 0),
      live: by("approved").length,
      // Buyer connected a few days ago and it is still live: did it sell?
      followUps: all.filter((p) => p.status === "approved" && p.followUpAt && p.followUpAt <= new Date().toISOString())
        .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt)),
      // Live for weeks with nobody confirming it is still for sale.
      stale: all.filter((p) => {
        if (p.status !== "approved") return false;
        const last = [p.approvedAt ?? p.dateAdded, p.availabilityCheckedAt].filter(Boolean).sort().pop();
        return last && ago(last) >= STALE_DAYS;
      }).sort((a, b) => (a.availabilityCheckedAt ?? a.approvedAt ?? a.dateAdded).localeCompare(b.availabilityCheckedAt ?? b.approvedAt ?? b.dateAdded)),
    };
  }, [products]);

  if (!products) return <Skeleton rows={6} />;
  const open = products.find((p) => p._id === openId) ?? null;
  const nothing = !data.pending.length && !data.deletes.length && !data.sold.length && !data.followUps.length && !data.stale.length;
  const run = async (fn, done) => { try { await fn(); toast(done); } catch { toast("Could not save", "error"); } };
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const tile = "rounded-2xl border border-adm-line bg-adm-surface px-3.5 py-3 text-start flex flex-col items-start gap-0.5 hover:border-adm-fade transition-colors min-w-0";
  return (
    <div>
      <PageHeader title="To do" sub={today}
        actions={data.pending.length > 0 && (
          <button type="button" onClick={() => setReviewing(true)} className={`${btn("primary")} max-lg:hidden`}>Review {data.pending.length} new</button>
        )} />

      <button type="button" onClick={() => setConnecting(true)} className={`${btn("primary")} w-full mb-3`}>
        <IconWhatsApp className="w-4 h-4" /> Connect buyer
      </button>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <button type="button" onClick={() => data.pending.length && setReviewing(true)} className={tile}>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade max-w-full truncate">To review</span>
          <span className="text-[22px] font-bold text-st-pending tabular-nums">{data.pending.length}</span>
          <span className="text-[11.5px] text-adm-soft max-sm:hidden">New products waiting</span>
        </button>
        <a href="#deletes" className={tile}>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade max-w-full truncate">{m.adminDeleteRequests()}</span>
          <span className="text-[22px] font-bold text-st-delete tabular-nums">{data.deletes.length}</span>
          <span className="text-[11.5px] text-adm-soft max-sm:hidden">Sellers asking to remove</span>
        </a>
        <Link to="/admin/fees" className={tile}>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade max-w-full truncate">Fees owed</span>
          <span className="text-[22px] font-bold text-st-sold tabular-nums max-w-full truncate" dir="ltr">{fmtIQD(data.owed)}</span>
          <span className="text-[11.5px] text-adm-soft max-sm:hidden">IQD from {data.owing} seller{data.owing === 1 ? "" : "s"}</span>
        </Link>
      </div>
      <p className="text-[12px] text-adm-fade mb-5 flex flex-wrap gap-x-3 gap-y-1">
        <span>{m.adminTotalEarned()}: <b className="text-adm-ink tabular-nums">{fmtIQD(data.earned)} IQD</b></span>
        <span>{m.statusApproved()}: <b className="text-adm-ink tabular-nums">{data.live}</b></span>
        <span>{m.adminSellers()}: <b className="text-adm-ink tabular-nums">{sellers?.length ?? "…"}</b></span>
      </p>

      {nothing && (
        <div className="rounded-2xl border border-adm-line bg-adm-surface py-12 px-6 text-center space-y-2 mb-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-st-approved-bg text-st-approved grid place-items-center"><IconCheck className="w-7 h-7" /></div>
          <p className="text-[17px] font-bold">All done</p>
          <p className="text-[13px] text-adm-soft">Nothing to review, no delete requests and every fee is collected.</p>
        </div>
      )}

      {data.pending.length > 0 && (
        <Group title="To review" count={data.pending.length}
          action={<button type="button" onClick={() => setReviewing(true)} className={btn("outline", "sm")}>One by one</button>}>
          <RowList>{data.pending.map((p) => <ProductRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)} />)}</RowList>
        </Group>
      )}

      {data.deletes.length > 0 && (
        <Group id="deletes" title={m.adminDeleteRequests()} count={data.deletes.length}>
          <RowList>{data.deletes.map((p) => <ProductRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)} />)}</RowList>
        </Group>
      )}
      {!data.deletes.length && <span id="deletes" />}

      {data.followUps.length > 0 && (
        <Group title="Ask seller: sold?" count={data.followUps.length}>
          <p className="text-[12.5px] text-adm-fade -mt-1 mb-2">A buyer was connected 3+ days ago and it is still live. Sold opens it to set the sale price (one unit at a time for stocked items); Not yet asks again in 3 days.</p>
          {data.followUps.map((p) => (
            <FollowRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)}
              note={`· ${p.leadCount ?? 1} buyer${(p.leadCount ?? 1) === 1 ? "" : "s"} · last ${ago(p.lastLeadAt ?? p.followUpAt)}d ago`}>
              <a href={waLink(p.sellerPhone, soldFollowUpMessage(p))} target="_blank" rel="noopener noreferrer" className={btn("wa", "sm")}><IconWhatsApp className="w-3.5 h-3.5" /> Ask seller</a>
              <button type="button" onClick={() => setOpenId(p._id)} className={btn("primary", "sm")}>Sold</button>
              <button type="button" onClick={() => run(() => snooze({ id: p._id }), "Asking again in 3 days")} className={btn("outline", "sm")}>Not yet</button>
              <button type="button" onClick={() => run(() => actions.markSoldElsewhere(p), "Sold elsewhere, seller notified")} className={btn("outline", "sm")}>Sold elsewhere</button>
            </FollowRow>
          ))}
        </Group>
      )}

      {data.sold.length > 0 && (
        <Group title="Sold, fee not collected" count={data.sold.length}
          action={<Link to="/admin/fees" className={btn("outline", "sm")}>Collect by seller</Link>}>
          <RowList>{data.sold.slice(0, 8).map((p) => <ProductRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)} />)}</RowList>
          {data.sold.length > 8 && (
            <Link to="/admin/products" search={{ tab: "sold" }} className="block text-center text-[12.5px] font-semibold text-adm-accent mt-2">See all {data.sold.length}</Link>
          )}
        </Group>
      )}

      {data.stale.length > 0 && (
        <Group title="Still for sale?" count={data.stale.length}>
          <p className="text-[12.5px] text-adm-fade -mt-1 mb-2">Live {STALE_DAYS}+ days without a check. Still for sale clears it for another {STALE_DAYS / 7} weeks.</p>
          {data.stale.slice(0, 12).map((p) => (
            <FollowRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)}
              note={`· live ${ago(p.approvedAt ?? p.dateAdded)} days${p.availabilityCheckedAt ? `, checked ${ago(p.availabilityCheckedAt)}d ago` : ", not checked"}`}>
              <a href={waLink(p.sellerPhone, stillForSaleMessage(p))} target="_blank" rel="noopener noreferrer" className={btn("wa", "sm")}><IconWhatsApp className="w-3.5 h-3.5" /> Ask seller</a>
              <button type="button" onClick={() => run(() => confirmAvailable({ id: p._id }), "Still for sale, checked")} className={btn("outline", "sm")}>Still for sale</button>
              <button type="button" onClick={() => setOpenId(p._id)} className={btn("primary", "sm")}>Sold</button>
              <button type="button" onClick={() => run(() => actions.markSoldElsewhere(p), "Sold elsewhere, seller notified")} className={btn("outline", "sm")}>Sold elsewhere</button>
            </FollowRow>
          ))}
          {data.stale.length > 12 && <p className="text-center text-[12px] text-adm-fade">{data.stale.length - 12} more after these</p>}
        </Group>
      )}






      {data.pending.length > 0 && (
        <div className="lg:hidden sticky z-20" style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
          <button type="button" onClick={() => setReviewing(true)} className={`${btn("primary", "lg")} w-full shadow-[var(--a-shadow)]`}>
            Review {data.pending.length} new product{data.pending.length === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {open && <ProductPanel product={open} onClose={() => setOpenId(null)} />}
      {reviewing && <ReviewMode queue={data.pending} onClose={() => setReviewing(false)} />}
      {connecting && <ConnectBuyer products={products} onClose={() => setConnecting(false)} onOpenProduct={(x) => { setConnecting(false); setOpenId(x._id); }} />}
    </div>
  );
}
