import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { deleteSellerFn } from "@/lib/clerk-seller";

export default function AdminSellersPage() {
  const sellers       = useQuery(api.users.getAll);
  const products      = useQuery(api.products.getAll);
  const setActive     = useMutation(api.users.setActive);
  const setRole       = useMutation(api.users.setRole);
  const createLog     = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // seller _id being confirmed
  const [confirmPromote, setConfirmPromote] = useState(null); // seller _id being confirmed

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
        {enriched.map((seller) => (
          <div key={seller._id} className={`bg-white rounded-xl border transition-colors overflow-hidden ${
            seller.isActive ? "border-[var(--color-hairline)]" : "border-[var(--color-hairline)] opacity-60"
          }`}>
            {/* Header Section: Avatar + Name + Status */}
            <div className="px-4 py-4 flex items-start gap-3 border-b border-[var(--color-hairline)]">
              <div className="w-12 h-12 rounded-full bg-[var(--color-ember-50)] flex items-center justify-center shrink-0">
                <span className="text-[var(--color-ember-600)] font-bold text-base">{seller.name?.[0]?.toUpperCase() ?? "?"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-ink)]">{seller.name}</p>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium mt-1.5 ${
                  seller.isActive ? "bg-green-100 text-green-700" : "bg-[var(--color-ember-50)] text-[var(--color-ink-fade)]"
                }`}>
                  {seller.isActive ? m.adminActive() : m.adminInactive()}
                </span>
              </div>
            </div>

            {/* Details Section: Contact Info */}
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

            {/* Actions Section */}
            <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
              {confirmPromote === seller._id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      await setRole({ id: seller._id, role: "admin" });
                      await createLog({
                        action: "seller_promoted_to_admin",
                        sellerName: seller.name,
                        notes: seller.email || undefined,
                      });
                      setConfirmPromote(null);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                  >
                    Promote
                  </button>
                  <button
                    onClick={() => setConfirmPromote(null)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 text-[var(--color-ink-fade)] hover:bg-white/60 transition-colors"
                  >
                    {m.adminCancel()}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmDelete(null);
                    setConfirmPromote(seller._id);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  Promote admin
                </button>
              )}

              <button
                onClick={async () => {
                  const newActive = !seller.isActive;
                  await setActive({ id: seller._id, isActive: newActive });
                  await createLog({
                    action: newActive ? "seller_activated" : "seller_deactivated",
                    sellerName: seller.name,
                    notes: seller.email || undefined,
                  });
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  seller.isActive
                    ? "bg-gray-100 hover:bg-red-50 text-[var(--color-ink-fade)] hover:text-red-600"
                    : "bg-green-50 hover:bg-green-100 text-green-600"
                }`}
              >
                {seller.isActive ? m.adminDeactivate() : m.adminActivate()}
              </button>

              {confirmDelete === seller._id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      await deleteSellerFn({ data: { sellerId: seller._id } });
                      await createLog({ action: "seller_deleted", sellerName: seller.name, notes: seller.email || undefined });
                      setConfirmDelete(null);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    {m.adminDelete()}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 text-[var(--color-ink-fade)] hover:bg-white/60 transition-colors"
                  >
                    {m.adminCancel()}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmPromote(null);
                    setConfirmDelete(seller._id);
                  }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title={m.adminDelete()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
