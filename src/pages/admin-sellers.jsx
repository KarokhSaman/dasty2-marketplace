import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/src/paraglide/messages";
import { deleteSellerFn } from "@/src/server/clerk-seller";

export default function AdminSellersPage() {
  const sellers       = useQuery(api.sellers.getAll);
  const products      = useQuery(api.products.getAll);
  const setActive     = useMutation(api.sellers.setActive);
  const createLog     = useMutation(api.adminLogs.create);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // seller _id being confirmed
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? "admin"));
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">{m.adminSellers()}</h1>
        <span className="text-sm text-gray-400">{sellers.length} {m.adminSellers().toLowerCase()}</span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={m.searchPlaceholder()}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>

      {enriched.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          <p className="text-sm font-medium">{m.adminNoSellers()}</p>
        </div>
      )}

      <div className="space-y-3">
        {enriched.map((seller) => (
          <div key={seller._id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
            seller.isActive ? "border-gray-100" : "border-gray-200 opacity-60"
          }`}>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <span className="text-rose-600 font-bold text-sm">{seller.name?.[0]?.toUpperCase() ?? "?"}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{seller.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  seller.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {seller.isActive ? m.adminActive() : m.adminInactive()}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {seller.email && (
                  <span className="text-xs text-gray-400" dir="ltr">{seller.email}</span>
                )}
                {seller.phone && (
                  <a
                    href={`https://wa.me/${seller.phone.replace(/\D/g,"")}`}
                    target="_blank" rel="noopener noreferrer"
                    dir="ltr"
                    className="text-xs text-green-600 hover:underline"
                  >
                    {seller.phone}
                  </a>
                )}
                <span className="text-xs text-gray-400">{seller.city}{seller.address ? `, ${seller.address}` : ""}</span>
                <span className="text-xs text-gray-400">
                  {seller.productCount} {m.adminProductCount()}
                </span>
                <span className="text-xs text-gray-300">
                  {seller.registeredAt?.slice(0,10)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActive({ id: seller._id, isActive: !seller.isActive })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  seller.isActive
                    ? "bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600"
                    : "bg-green-50 hover:bg-green-100 text-green-600"
                }`}
              >
                {seller.isActive ? m.adminDeactivate() : m.adminActivate()}
              </button>

              {confirmDelete === seller._id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      await deleteSellerFn({ data: { sellerId: seller._id, clerkUserId: seller.clerkUserId || undefined } });
                      await createLog({ adminEmail, action: "seller_deleted", sellerName: seller.name, notes: seller.email || undefined });
                      setConfirmDelete(null);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    {m.adminDelete()}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    {m.adminCancel()}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(seller._id)}
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
