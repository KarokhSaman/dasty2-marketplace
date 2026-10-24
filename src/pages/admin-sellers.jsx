import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useSearch } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import SellerPanel, { feeDeal } from "@/components/admin/SellerPanel";
import ProductPanel from "@/components/admin/ProductPanel";
import { RowList } from "@/components/admin/ProductRow";
import { PageHeader, SearchBox, FilterChips, Avatar, StoreTag, Empty, Skeleton, fmtIQD, useCopy, ltrPhone, IconWhatsApp } from "@/components/admin/ui";

export default function AdminSellersPage() {
  const search = useSearch({ strict: false }) ?? {};
  const sellers = useQuery(api.users.getAll);
  const products = useQuery(api.products.getAll);
  const stores = useQuery(api.stores.listAll);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(search.seller ?? null);
  const [productId, setProductId] = useState(null);
  const copy = useCopy();

  const rows = useMemo(() => {
    if (!sellers || !products || !stores) return [];
    const storeOwners = new Set(stores.flatMap((st) => [st.sellerId, st.linkedUserId].filter(Boolean).map(String)));
    const stats = new Map();
    for (const p of products) {
      const s = stats.get(p.sellerId) ?? { live: 0, waiting: 0, sold: 0, owes: 0, total: 0 };
      s.total++;
      if (p.status === "approved") s.live++;
      if (p.status === "pending") s.waiting++;
      if (p.status === "sold" || p.status === "paid") s.sold++;
      if (p.status === "sold") s.owes += p.profit ?? 0;
      stats.set(p.sellerId, s);
    }
    return sellers
      .map((s) => ({ ...s, ...(stats.get(s._id) ?? { live: 0, waiting: 0, sold: 0, owes: 0, total: 0 }), hasStore: storeOwners.has(String(s._id)) }))
      .sort((a, b) => (b.registeredAt ?? "").localeCompare(a.registeredAt ?? ""));
  }, [sellers, products, stores]);

  const counts = useMemo(() => ({
    all: rows.length,
    owes: rows.filter((s) => s.owes > 0).length,
    empty: rows.filter((s) => s.total === 0).length,
    stores: rows.filter((s) => s.hasStore).length,
    custom: rows.filter((s) => s.feeMode && s.feeMode !== "default").length,
    off: rows.filter((s) => !s.isActive).length,
  }), [rows]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((s) =>
      (filter === "all" || (filter === "owes" && s.owes > 0) || (filter === "empty" && s.total === 0) || (filter === "stores" && s.hasStore) ||
        (filter === "custom" && s.feeMode && s.feeMode !== "default") || (filter === "off" && !s.isActive)) &&
      (!needle || [s.name, s.phone, s.email, s.city].some((v) => (v ?? "").toLowerCase().includes(needle))))
      .sort((a, b) => (filter === "owes" ? b.owes - a.owes : 0));
  }, [rows, q, filter]);

  if (!sellers || !products || !stores) return <Skeleton rows={6} />;
  const open = rows.find((s) => s._id === openId) ?? null;
  const product = products.find((p) => p._id === productId) ?? null;

  return (
    <div>
      <PageHeader title={m.adminSellers()} sub={`${rows.length} sellers · ${rows.length - counts.off} active`} />
      <div className="space-y-2.5 mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, phone or city" />
        <FilterChips value={filter} onChange={setFilter} options={[
          { value: "all", label: m.adminAllStatus(), count: counts.all },
          { value: "owes", label: "Owes fees", count: counts.owes },
          // Signed up but never posted — copy their number to offer help.
          { value: "empty", label: "No products", count: counts.empty },
          { value: "stores", label: m.storesFilter(), count: counts.stores },
          { value: "custom", label: "Custom fee", count: counts.custom },
          { value: "off", label: m.adminInactive(), count: counts.off },
        ]} />
      </div>

      <RowList>
        {list.length === 0 && <Empty>{m.adminNoSellers()}</Empty>}
        {list.map((s) => (
          <div key={s._id} role="button" tabIndex={0} onClick={() => setOpenId(s._id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(s._id)}
            className={`flex items-center gap-3 px-3 lg:px-4 py-3 min-h-[76px] cursor-pointer hover:bg-adm-sunk ${s.isActive ? "" : "opacity-55"}`}>
            <Avatar name={s.name} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14.5px] font-semibold truncate">{s.name || "Unnamed"}</span>
                {s.hasStore && <StoreTag />}
                {s.feeMode && s.feeMode !== "default" && <span className="h-[18px] px-1.5 rounded-[5px] text-[10px] font-bold bg-st-pending-bg text-st-pending inline-flex items-center">{feeDeal(s)}</span>}
                {!s.isActive && <span className="h-[18px] px-1.5 rounded-[5px] text-[10px] font-bold bg-st-rejected-bg text-st-rejected inline-flex items-center">{m.adminInactive()}</span>}
              </div>
              <p className="text-[12px] text-adm-fade mt-0.5 truncate"><span dir="ltr" className="tabular-nums">{s.phone}</span>{s.city ? ` · ${s.city}` : ""}</p>
              <p className="text-[11.5px] text-adm-soft mt-1 flex gap-3">
                <span><b className="text-adm-ink tabular-nums">{s.live}</b> live</span>
                <span><b className="text-adm-ink tabular-nums">{s.waiting}</b> waiting</span>
                <span><b className="text-adm-ink tabular-nums">{s.sold}</b> sold</span>
              </p>
            </div>
            <div className="text-end shrink-0">
              {s.owes ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-adm-fade">Owes</p>
                  <p className="text-[15px] font-bold text-st-sold tabular-nums" dir="ltr">{fmtIQD(s.owes)}</p>
                </>
              ) : (
                <button type="button" aria-label={`Copy ${s.phone}`}
                  onClick={(e) => { e.stopPropagation(); copy(ltrPhone(s.phone), "Number copied"); }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-adm-line bg-adm-surface text-[12.5px] font-semibold text-adm-ink active:bg-adm-sunk">
                  <IconWhatsApp className="w-4 h-4 text-[#25D366]" /> Copy
                </button>
              )}
            </div>
          </div>
        ))}
      </RowList>

      {open && <SellerPanel seller={open} products={products} sellers={sellers} stores={stores} onClose={() => setOpenId(null)} onOpenProduct={setProductId} />}
      {product && <ProductPanel product={product} onClose={() => setProductId(null)} />}
    </div>
  );
}
