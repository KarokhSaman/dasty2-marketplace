import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import ProductRow, { RowList } from "@/components/admin/ProductRow";
import ProductPanel from "@/components/admin/ProductPanel";
import ReviewMode from "@/components/admin/ReviewMode";
import { useProductActions } from "@/components/admin/useProductActions";
import { PageHeader, SearchBox, FilterChips, Empty, Skeleton, btn, useToast, IconX } from "@/components/admin/ui";

const PAGE = 60;
const TABS = [
  ["all", () => m.adminAllStatus()],
  ["pending", () => m.statusPending()],
  ["approved", () => m.statusApproved()],
  ["sold", () => m.statusSold()],
  ["paid", () => m.statusPaid()],
  ["deletion_requested", () => m.adminDeleteRequests()],
  ["rejected", () => m.statusRejected()],
  ["sponsored", () => "Sponsored"],
];

export default function AdminProductsPage() {
  const search = useSearch({ strict: false }) ?? {};
  const navigate = useNavigate();
  const products = useQuery(api.products.getAll);
  const actions = useProductActions();
  const toast = useToast();

  const tab = TABS.some(([k]) => k === search.tab) ? search.tab : "all";
  const sellerId = search.sellerId ?? null;
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState(search.focus ?? null);
  const [selected, setSelected] = useState(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const setTab = (next) => navigate({ to: "/admin/products", search: (s) => ({ ...s, tab: next === "all" ? undefined : next, focus: undefined }), replace: true });
  const clearSeller = () => navigate({ to: "/admin/products", search: (s) => ({ ...s, sellerId: undefined }), replace: true });

  useEffect(() => { setShown(PAGE); setSelected(new Set()); }, [tab, sellerId, q, category, city]);

  const base = useMemo(() => (products ?? []).filter((p) => !sellerId || p.sellerId === sellerId), [products, sellerId]);

  const counts = useMemo(() => {
    const c = { all: base.length, sponsored: 0 };
    for (const p of base) { c[p.status] = (c[p.status] ?? 0) + 1; if (p.featured) c.sponsored++; }
    return c;
  }, [base]);

  const cities = useMemo(() => [...new Set(base.map((p) => p.city).filter(Boolean))].sort(), [base]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const items = base.filter((p) =>
      (tab === "all" || (tab === "sponsored" ? p.featured : p.status === tab)) &&
      (!category || p.category === category) &&
      (!city || p.city === city) &&
      (!needle || [p.title, p.seq, p.sellerName, p.sellerPhone, p.category, p.brand, p.city, p.storeName].some((v) => (v ?? "").toLowerCase().includes(needle))));
    const key = (p) => ((tab === "sold" || tab === "paid") && p.dateSold ? p.dateSold : p.dateAdded) ?? "";
    return items.sort((a, b) => key(b).localeCompare(key(a)));
  }, [base, tab, q, category, city]);

  const pending = useMemo(() => base.filter((p) => p.status === "pending").sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)), [base]);
  const open = products?.find((p) => p._id === openId) ?? null;
  const sellerName = sellerId ? base[0]?.sellerName : null;

  const picked = list.filter((p) => selected.has(p._id));
  const canApprove = picked.filter((p) => p.status === "pending");
  const canPay = picked.filter((p) => p.status === "sold");
  const toggle = (p) => setSelected((s) => { const n = new Set(s); n.has(p._id) ? n.delete(p._id) : n.add(p._id); return n; });

  async function bulk(kind) {
    const items = kind === "approve" ? canApprove : canPay;
    setBulkBusy(true);
    let ok = 0;
    try {
      for (const p of items) { kind === "approve" ? await actions.approve(p) : await actions.markPaid(p); ok++; }
      toast(kind === "approve" ? `Approved ${ok}` : `Marked ${ok} paid`);
      setSelected(new Set());
    } catch (err) {
      toast(`${ok} done. ${errorMessage(err, "Then something went wrong")}`, "error");
    } finally {
      setBulkBusy(false);
    }
  }

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

      {list.length === 0 ? (
        <RowList><Empty>{m.adminNoProducts()}</Empty></RowList>
      ) : (
        <>
          <RowList>
            {list.slice(0, shown).map((p) => (
              <ProductRow key={p._id} product={p} onOpen={(x) => setOpenId(x._id)} selected={selected.has(p._id)} onToggle={toggle} />
            ))}
          </RowList>
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${btn("outline")} w-full mt-3`}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </>
      )}

      {selected.size > 0 && (
        <div className="fixed z-40 inset-x-3 lg:inset-x-auto lg:start-[calc(232px+32px)] lg:end-8 bottom-[76px] lg:bottom-6 flex justify-center pointer-events-none"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-adm-ink text-adm-surface p-1.5 ps-4 shadow-[var(--a-shadow)] max-w-full overflow-x-auto">
            <span className="text-[13px] font-semibold whitespace-nowrap me-1">{selected.size} selected</span>
            <button type="button" disabled={!canApprove.length || bulkBusy} onClick={() => bulk("approve")}
              className="h-9 px-3 rounded-xl bg-white/15 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-40">{m.adminApprove()} {canApprove.length || ""}</button>
            <button type="button" disabled={!canPay.length || bulkBusy} onClick={() => bulk("paid")}
              className="h-9 px-3 rounded-xl bg-white/15 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-40">{m.adminMarkPaid()} {canPay.length || ""}</button>
            <button type="button" onClick={() => setSelected(new Set())} aria-label="Clear selection" className="h-9 w-9 grid place-items-center rounded-xl"><IconX className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {open && <ProductPanel product={open} onClose={() => setOpenId(null)} />}
      {reviewing && <ReviewMode queue={pending} onClose={() => setReviewing(false)} />}
    </div>
  );
}
