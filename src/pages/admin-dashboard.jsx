import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { formatPrice } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

const PAGE_SIZE = 25;

const ACTION_META = {
  approved:          { label: "Approved",          color: "bg-green-100 text-green-700"   },
  rejected:          { label: "Rejected",          color: "bg-red-100 text-red-600"       },
  marked_sold:       { label: "Marked Sold",       color: "bg-blue-100 text-blue-700"     },
  marked_paid:       { label: "Marked Paid",       color: "bg-purple-100 text-purple-700" },
  deleted:           { label: "Deleted",           color: "bg-gray-100 text-gray-600"     },
  seller_promoted_to_admin:{ label: "Promoted Admin", color: "bg-indigo-100 text-indigo-700" },
  admin_demoted_to_seller:{ label: "Made Seller", color: "bg-gray-100 text-gray-700" },
  featured:          { label: "Featured",          color: "bg-amber-100 text-amber-700"   },
  unfeatured:        { label: "Unfeatured",        color: "bg-gray-100 text-gray-500"     },
  offer_created:     { label: "Offer Created",     color: "bg-rose-100 text-rose-600"     },
  offer_deactivated: { label: "Offer Deactivated", color: "bg-gray-100 text-gray-500"     },
  offer_reactivated: { label: "Offer Reactivated", color: "bg-green-100 text-green-600"   },
  offer_deleted:     { label: "Offer Deleted",     color: "bg-red-100 text-red-500"       },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

// ── Stats panel ────────────────────────────────────────────
function StatsPanel({ products, sellers, pending, approved, sold, paid }) {
  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/products?tab=paid"
          className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-4 relative overflow-hidden block">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full"/>
          <p className="text-[11px] font-semibold text-green-100 uppercase tracking-widest mb-1">{m.adminTotalEarned()}</p>
          <p className="text-3xl font-bold text-white leading-none">
            {formatPrice(paid.reduce((s, p) => s + (p.profit ?? 0), 0))}
          </p>
          <p className="text-[11px] text-green-100 mt-2">{paid.length} {m.statPaid().toLowerCase()}</p>
        </Link>

        <Link to="/admin/products?tab=sold"
          className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-4 relative overflow-hidden block">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full"/>
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-widest mb-1">{m.adminPendingPayout()}</p>
          <p className="text-3xl font-bold text-white leading-none">
            {formatPrice(sold.reduce((s, p) => s + (p.profit ?? 0), 0))}
          </p>
          <p className="text-[11px] text-amber-100 mt-2">{sold.length} {m.statSold().toLowerCase()}</p>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex divide-x divide-gray-100 overflow-hidden">
        {[
          { label: m.statTotal(),    value: products.length, color: "text-gray-800",  href: "/admin/products?tab=all" },
          { label: m.statPending(),  value: pending.length,  color: "text-amber-600", href: "/admin/products?tab=pending" },
          { label: m.statApproved(), value: approved.length, color: "text-green-600", href: "/admin/products?tab=approved" },
          { label: m.adminSellers(), value: sellers.length,  color: "text-rose-600",  href: "/admin/sellers" },
        ].map((item, i) => (
          <Link key={i} to={item.href} className="flex-1 flex flex-col items-center py-3.5 gap-0.5 hover:bg-gray-50 transition-colors">
            <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
            <span className="text-[10px] text-gray-400 font-medium leading-tight text-center px-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const products = useQuery(api.products.getAll);
  const sellers  = useQuery(api.users.getAll);
  const logs     = useQuery(api.adminLogs.getAll);

  if (!products || !sellers) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 bg-gray-200 rounded-2xl"/>
          <div className="h-28 bg-gray-200 rounded-2xl"/>
        </div>
        <div className="h-16 bg-gray-200 rounded-2xl"/>
        <div className="h-8 bg-gray-200 rounded w-40"/>
        <div className="space-y-2">
          {Array.from({length: 5}).map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl"/>)}
        </div>
      </div>
    );
  }

  const pending  = products.filter(p => p.status === "pending");
  const approved = products.filter(p => p.status === "approved");
  const sold     = products.filter(p => p.status === "sold");
  const paid     = products.filter(p => p.status === "paid");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const visibleLogs = (logs ?? []).slice(0, visibleCount);
  const hasMore     = (logs?.length ?? 0) > visibleCount;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{m.adminDashboard()}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* ── Stats ── */}
      <StatsPanel
        products={products} sellers={sellers}
        pending={pending} approved={approved} sold={sold} paid={paid}
      />

      {/* ── Activity log ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">Activity Log</h2>
          {logs && logs.length > 0 && (
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
              {logs.length}
            </span>
          )}
        </div>
      </div>

      {!logs ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({length: 5}).map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl"/>)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 flex flex-col items-center text-gray-300">
          <svg className="w-10 h-10 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">No actions logged yet</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {visibleLogs.map(log => {
                const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={log._id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600 shrink-0 mt-0.5">
                      {log.adminEmail[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700" dir="ltr">{log.adminEmail}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      {log.productTitle && (
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          "{log.productTitle}"
                          {log.sellerName && <span className="text-gray-400"> · {log.sellerName}</span>}
                          {log.price && <span className="text-gray-400"> · {formatPrice(log.price)}</span>}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-[11px] text-red-500 mt-0.5 bg-red-50 rounded-lg px-2 py-1 inline-block">
                          Reason: {log.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 mt-1">{timeAgo(log.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMore && (
            <button
              onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
              className="w-full mt-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-rose-600 bg-white border border-gray-200 hover:border-rose-300 rounded-xl transition-colors">
              Load more ({(logs.length - visibleCount)} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
