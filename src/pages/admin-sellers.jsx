import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { deleteSellerFn } from "@/lib/clerk-seller";
import SellerActionsMenu from "@/components/admin/SellerActionsMenu";

export default function AdminSellersPage() {
  const sellers       = useQuery(api.users.getAll);
  const products      = useQuery(api.products.getAll);
  const setActive     = useMutation(api.users.setActive);
  const setRole       = useMutation(api.users.setRole);
  const createLog     = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");
  const [expandedSeller, setExpandedSeller] = useState(null);

  const enriched = useMemo(() => {
    if (!sellers || !products) return [];
    return sellers
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q) || (s.email ?? "").toLowerCase().includes(q);
      })
      .map((s) => ({
        ...s,
        productCount: products.filter((p) => p.sellerId === s._id).length,
      }))
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }, [sellers, products, search]);

  if (!sellers || !products) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{m.adminSellers()}</h1>
        <span className="text-sm text-[var(--color-ink-fade)]">{sellers.length} {m.adminSellers().toLowerCase()}</span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={m.searchPlaceholder()}
          className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"
        />
      </div>

      {enriched.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-hairline)] py-16 text-center text-[var(--color-ink-fade)]">
          <p className="text-sm font-medium">{m.adminNoSellers()}</p>
        </div>
      )}

      <div className="space-y-3">
        {enriched.map((seller) => {
          const isExpanded = expandedSeller === seller._id;
          return (
          <div key={seller._id} className={`bg-white rounded-xl border transition-colors overflow-hidden ${
            seller.isActive ? "border-[var(--color-hairline)]" : "border-[var(--color-hairline)] opacity-60"
          }`}>
            {/* Header Section: Avatar + Name + Phone/Address + Status + Actions - Clickable */}
            <div className="px-4 py-4 flex items-start gap-3 border-b border-[var(--color-hairline)] hover:bg-[var(--color-cream)] transition-colors">
              <button onClick={() => setExpandedSeller(isExpanded ? null : seller._id)}
                className="flex-1 flex items-start gap-3 text-left min-w-0">
                <div className="w-12 h-12 rounded-full bg-[var(--color-ember-50)] flex items-center justify-center shrink-0">
                  <span className="text-[var(--color-ember-600)] font-bold text-base">{seller.name?.[0]?.toUpperCase() ?? "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-ink)]">{seller.name}</p>
                  {seller.phone && (
                    <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 truncate" dir="ltr">
                      {seller.phone}
                    </p>
                  )}
                  {(seller.city || seller.address) && (
                    <p className="text-xs text-[var(--color-ink-fade)] mt-1 truncate">
                      {seller.city}{seller.address ? `, ${seller.address}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs text-[var(--color-ink-fade)] font-semibold uppercase tracking-wide">Status</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">
                    {seller.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="shrink-0 flex items-center pt-1">
                  <svg className={`w-5 h-5 text-[var(--color-ink-fade)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>
              <div className="shrink-0 pt-1">
                <SellerActionsMenu
                  seller={seller}
                  onPromote={async () => {
                    await setRole({ id: seller._id, role: "admin" });
                    await createLog({
                      action: "seller_promoted_to_admin",
                      sellerName: seller.name,
                      notes: seller.email || undefined,
                    });
                  }}
                  onToggleActive={async () => {
                    const newActive = !seller.isActive;
                    await setActive({ id: seller._id, isActive: newActive });
                    await createLog({
                      action: newActive ? "seller_activated" : "seller_deactivated",
                      sellerName: seller.name,
                      notes: seller.email || undefined,
                    });
                  }}
                  onDelete={async () => {
                    await deleteSellerFn({ data: { sellerId: seller._id } });
                    await createLog({
                      action: "seller_deleted",
                      sellerName: seller.name,
                      notes: seller.email || undefined,
                    });
                  }}
                />
              </div>
            </div>

            {/* Details Section: Contact Info - Collapsible */}
            {isExpanded && (
            <div className="px-4 py-4 space-y-2.5 border-b border-[var(--color-hairline)]">
              {seller.email && (
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-sm text-[var(--color-ink)]" dir="ltr">{seller.email}</p>
                </div>
              )}
              {seller.phone && (
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Phone</p>
                  <a
                    href={`https://wa.me/${seller.phone.replace(/\D/g,"")}`}
                    target="_blank" rel="noopener noreferrer"
                    dir="ltr"
                    className="text-sm text-green-600 hover:underline"
                  >
                    {seller.phone}
                  </a>
                </div>
              )}
              {(seller.city || seller.address) && (
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Address</p>
                  <p className="text-sm text-[var(--color-ink)]">{seller.city}{seller.address ? `, ${seller.address}` : ""}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Products</p>
                  <p className="text-sm text-[var(--color-ink)] font-medium">{seller.productCount}</p>
                </div>
                {seller.registeredAt && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-0.5">Joined</p>
                    <p className="text-sm text-[var(--color-ink)] font-medium">{seller.registeredAt?.slice(0,10)}</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
