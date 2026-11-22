import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import ProductRow, { RowList } from "@/components/admin/ProductRow";
import ProductPanel from "@/components/admin/ProductPanel";
import ReviewMode from "@/components/admin/ReviewMode";
import { stillForSaleMessage } from "@/components/admin/buyerMessages";
import { useProductActions } from "@/components/admin/useProductActions";
import { FollowRow, SellerBlock, groupBySeller, ago, isUnchecked, lastChecked, UNCHECKED_DAYS } from "@/components/admin/followUps";
import { PageHeader, SearchBox, FilterChips, Empty, Skeleton, btn, useToast, waLink, IconX, IconWhatsApp } from "@/components/admin/ui";

const PAGE = 60;
const TABS = [
  ["all", () => m.adminAllStatus()],
  ["pending", () => m.statusPending()],
  ["approved", () => m.statusApproved()],
  ["sold", () => m.statusSold()],
  ["paid", () => m.statusPaid()],
  ["deletion_requested", () => m.adminDeleteRequests()],
  ["rejected", () => m.statusRejected()],
  ["sold_elsewhere", () => m.statusSoldElsewhere()],
  ["sponsored", () => "Sponsored"],
  // Live 60+ days with nobody confirming it is still for sale.
  ["unchecked", () => "Not checked"],
];

export default function AdminProductsPage() {
  const search = useSearch({ strict: false }) ?? {};
  const navigate = useNavigate();
  const products = useQuery(api.products.getAll);

  const tab = TABS.some(([k]) => k === search.tab) ? search.tab : "all";
  const sellerId = search.sellerId ?? null;
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState(search.focus ?? null);
  const [reviewing, setReviewing] = useState(false);
  const confirmAvailable = useMutation(api.leads.confirmAvailable);
  const actions = useProductActions();
  const toast = useToast();
  const run = async (fn, done) => { try { await fn(); toast(done); } catch { toast("Could not save", "error"); } };

  const setTab = (next) => navigate({ to: "/admin/products", search: (s) => ({ ...s, tab: next === "all" ? undefined : next, focus: undefined }), replace: true });
  const clearSeller = () => navigate({ to: "/admin/products", search: (s) => ({ ...s, sellerId: undefined }), replace: true });

  useEffect(() => { setShown(PAGE); }, [tab, sellerId, q, category, city]);

  const base = useMemo(() => (products ?? []).filter((p) => !sellerId || p.sellerId === sellerId), [products, sellerId]);

  const counts = useMemo(() => {
    const c = { all: base.length, sponsored: 0, unchecked: 0 };
    for (const p of base) { c[p.status] = (c[p.status] ?? 0) + 1; if (p.featured) c.sponsored++; if (isUnchecked(p)) c.unchecked++; }
    return c;
  }, [base]);

  const cities = useMemo(() => [...new Set(base.map((p) => p.city).filter(Boolean))].sort(), [base]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = base.filter((p) =>
      (tab === "all" || (tab === "sponsored" ? p.featured : tab === "unchecked" ? isUnchecked(p) : p.status === tab)) &&
      (!category || p.category === category) &&
      (!city || p.city === city) &&
      (!needle || [p.title, p.seq, p.sellerName, p.sellerPhone, p.category, p.brand, p.city, p.storeName].some((v) => (v ?? "").toLowerCase().includes(needle))));
    // Not checked: the longest-unchecked first.
    if (tab === "unchecked") return items.sort((a, b) => lastChecked(a).localeCompare(lastChecked(b)));
    const key = (p) => ((tab === "sold" || tab === "paid") && p.dateSold ? p.dateSold : p.dateAdded) ?? "";
    return items.sort((a, b) => key(b).localeCompare(key(a)));
  }, [base, tab, q, category, city]);

  const pending = useMemo(() => base.filter((p) => p.status === "pending").sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)), [base]);
  const open = products?.find((p) => p._id === openId) ?? null;
  const sellerName = sellerId ? base[0]?.sellerName : null;

  if (!products) return <Skeleton rows={8} />;

  return (
    <div>
      <PageHeader
        title={m.adminProducts()}
        sub={`${base.length} products`}
        actions={pending.length > 0 && (
          <button type="button" onClick={() => setReviewing(true)} className={btn("primary")}>Review {pending.length}</button>
        )}
      />

      {sellerId && (
        <div className="flex items-center gap-2 mb-3 rounded-xl bg-st-sold-bg text-st-sold px-3 h-10 text-[13px] font-semibold">
          <span className="flex-1 truncate">Only {sellerName ?? "this seller"}'s products</span>
          <button type="button" onClick={clearSeller} className="inline-flex items-center gap-1"><IconX className="w-4 h-4" /> Show all</button>
        </div>
      )}

      <div className="space-y-2.5 mb-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_200px_180px]">
          <SearchBox value={q} onChange={setQ} placeholder="Search code, title, seller, phone…" />
          <div className="grid grid-cols-2 gap-2 lg:contents">
            <CustomSelect value={category} onChange={setCategory} placeholder="All categories" listClassName="max-h-64"
              options={[{ value: "", label: "All categories" }, ...CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value }))]} />
            <CustomSelect value={city} onChange={setCity} placeholder="All cities" listClassName="max-h-64"
              options={[{ value: "", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]} />
          </div>
        </div>
        <FilterChips value={tab} onChange={setTab}
          options={TABS.map(([k, label]) => ({ value: k, label: label(), count: counts[k] ?? 0 }))} />
      </div>

      {tab === "unchecked" && (
        <p className="text-[12.5px] text-adm-fade mb-2">Live {UNCHECKED_DAYS}+ days without a check: ask the seller if it is still for sale. Still for sale clears it for another {UNCHECKED_DAYS} days. A seller's items are messaged together.</p>
      )}
      {list.length === 0 ? (
        <RowList><Empty>{m.adminNoProducts()}</Empty></RowList>
      ) : tab === "unchecked" ? (
        <>
          {groupBySeller(list.slice(0, shown)).map((group) => (
            <SellerBlock key={group[0].sellerId} group={group} message={stillForSaleMessage}>
              {(many) => group.map((p) => (
                <FollowRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)}
                  note={`· live ${ago(p.approvedAt ?? p.dateAdded)} days${p.availabilityCheckedAt ? `, checked ${ago(p.availabilityCheckedAt)}d ago` : ", not checked"}`}>
                  {!many && <a href={waLink(p.sellerPhone, stillForSaleMessage(p))} target="_blank" rel="noopener noreferrer" className={btn("wa", "sm")}><IconWhatsApp className="w-3.5 h-3.5" /> Ask seller</a>}
                  <button type="button" onClick={() => run(() => confirmAvailable({ id: p._id }), "Still for sale, checked")} className={btn("outline", "sm")}>Still for sale</button>
                  <button type="button" onClick={() => setOpenId(p._id)} className={btn("primary", "sm")}>Sold</button>
                  <button type="button" onClick={() => run(() => actions.markSoldElsewhere(p), "Sold elsewhere, seller notified")} className={btn("outline", "sm")}>Sold elsewhere</button>
                </FollowRow>
              ))}
            </SellerBlock>
          ))}
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btn("outline")} w-full mt-3`}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </>
      ) : (
        <>
          <RowList>
            {list.slice(0, shown).map((p) => (
              <ProductRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)} />
            ))}
          </RowList>
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btn("outline")} w-full mt-3`}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </>
      )}

      {open && <ProductPanel product={open} onClose={() => setOpenId(null)} />}
      {reviewing && <ReviewMode queue={pending} onClose={() => setReviewing(false)} />}
    </div>
  );
}
