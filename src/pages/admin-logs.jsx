import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatPrice } from "@/lib/utils";

const ACTION_META = {
  approved:          { label: "Approved",          color: "bg-green-100 text-green-700"  },
  rejected:          { label: "Rejected",          color: "bg-red-100 text-red-600"      },
  marked_sold:       { label: "Marked Sold",       color: "bg-blue-100 text-blue-700"    },
  marked_paid:       { label: "Marked Paid",       color: "bg-purple-100 text-purple-700"},
  deleted:           { label: "Deleted",           color: "bg-gray-100 text-[var(--color-ink-soft)]"    },
  seller_deleted:    { label: "Seller Deleted",    color: "bg-red-100 text-red-700"      },
  seller_deactivated:{ label: "Seller Deactivated",color: "bg-orange-100 text-orange-700"},
  seller_activated:  { label: "Seller Activated",  color: "bg-green-100 text-green-700"  },
  seller_promoted_to_admin:{ label: "Promoted Admin", color: "bg-indigo-100 text-indigo-700" },
  admin_demoted_to_seller:{ label: "Made Seller", color: "bg-gray-100 text-[var(--color-ink)]" },
  featured:          { label: "Featured",          color: "bg-amber-100 text-amber-700"  },
  unfeatured:        { label: "Unfeatured",        color: "bg-[var(--color-ember-50)] text-[var(--color-ink-fade)]"    },
  offer_created:     { label: "Offer Created",     color: "bg-rose-100 text-[var(--color-ember-600)]"    },
  offer_deactivated: { label: "Offer Deactivated", color: "bg-[var(--color-ember-50)] text-[var(--color-ink-fade)]"    },
  offer_reactivated: { label: "Offer Reactivated", color: "bg-green-100 text-green-600"  },
  offer_deleted:     { label: "Offer Deleted",     color: "bg-red-100 text-red-500"      },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export default function AdminLogsPage() {
  const logs = useQuery(api.adminLogs.getAll);

  // Group by admin email for the summary
  const summary = logs ? logs.reduce((acc, log) => {
    acc[log.adminEmail] = (acc[log.adminEmail] || 0) + 1;
    return acc;
  }, {}) : {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Activity Log</h1>
        <p className="text-sm text-[var(--color-ink-fade)] mt-0.5">Every admin action recorded in chronological order</p>
      </div>

      {/* ── Admin summary ── */}
      {Object.keys(summary).length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-4">
          <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest mb-3">Admin Activity Summary</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary).map(([email, count]) => (
              <div key={email} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-[var(--color-ember-600)]">
                  {email[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800" dir="ltr">{email}</p>
                  <p className="text-[10px] text-[var(--color-ink-fade)]">{count} action{count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Log list ── */}
      {!logs ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-2xl"/>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[var(--color-hairline)] py-16 flex flex-col items-center text-gray-300">
          <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p className="text-sm text-[var(--color-ink-fade)] font-medium">No actions logged yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-gray-100 text-[var(--color-ink-soft)]" };
              return (
                <div key={log._id} className="px-4 py-3.5 flex items-start gap-3">
                  {/* Admin avatar */}
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-[var(--color-ember-600)] shrink-0 mt-0.5">
                    {log.adminEmail[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--color-ink)]" dir="ltr">{log.adminEmail}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>

                    {(log.sellerName || log.productCode) && (
                      <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 truncate">
                        {log.sellerName && <span>{log.sellerName}</span>}
                        {log.sellerName && log.productCode && <span className="text-[var(--color-ink-fade)]"> · </span>}
                        {log.productCode && <span className="text-[var(--color-ink-fade)]">{log.productCode}</span>}
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] text-[var(--color-ink-fade)] shrink-0 mt-1">{timeAgo(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
