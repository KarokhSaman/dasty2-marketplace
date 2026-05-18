"use client";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, color, iconBg, icon, href }) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
        <p className="text-[11px] text-gray-400 mt-1 font-medium leading-tight">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Revenue card ───────────────────────────────────────────
function RevenueCard({ label, amount, sub, bg, textColor, subColor }) {
  return (
    <div className={`rounded-2xl p-5 ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${subColor}`}>{label}</p>
      <p className={`text-3xl font-bold ${textColor}`}>{amount}</p>
      <p className={`text-xs mt-1.5 ${subColor}`}>{sub}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useT();
  const router = useRouter();

  const products  = useQuery(api.products.getAll);
  const sellers   = useQuery(api.sellers.getAll);
  const updateStatus = useMutation(api.products.updateStatus);
  const createNotif  = useMutation(api.notifications.create);

  if (!products || !sellers) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-56"/>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 bg-gray-200 rounded-2xl"/>
          <div className="h-28 bg-gray-200 rounded-2xl"/>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl"/>)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl"/>
      </div>
    );
  }

  const pending  = products.filter(p => p.status === "pending");
  const approved = products.filter(p => p.status === "approved");
  const sold     = products.filter(p => p.status === "sold");
  const paid     = products.filter(p => p.status === "paid");

  const totalEarned   = paid.reduce((s,p) => s + (p.profit ?? 0), 0);
  const pendingPayout = sold.reduce((s,p) => s + (p.profit ?? 0), 0);

  const today = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  async function approve(product) {
    await updateStatus({ id: product._id, status: "approved", approvedBy: "admin", approvedAt: new Date().toISOString() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminApproveMsg(product.title) });
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.adminDashboard}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* ── Revenue cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <RevenueCard
          label={t.adminTotalEarned}
          amount={formatPrice(totalEarned)}
          sub={`${paid.length} ${t.statPaid.toLowerCase()}`}
          bg="bg-gradient-to-br from-green-500 to-emerald-400"
          textColor="text-white"
          subColor="text-green-100"
        />
        <RevenueCard
          label={t.adminPendingPayout}
          amount={formatPrice(pendingPayout)}
          sub={`${sold.length} ${t.statSold.toLowerCase()}`}
          bg="bg-gradient-to-br from-amber-500 to-orange-400"
          textColor="text-white"
          subColor="text-amber-100"
        />
      </div>

      {/* ── Stats grid ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label={t.statTotal} value={products.length} color="text-gray-800" iconBg="bg-gray-100"
          icon={<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>}
          href="/admin/products?tab=all"/>
        <StatCard label={t.statPending} value={pending.length} color="text-amber-600" iconBg="bg-amber-50"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          href="/admin/products?tab=pending"/>
        <StatCard label={t.statApproved} value={approved.length} color="text-green-600" iconBg="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          href="/admin/products?tab=approved"/>
        <StatCard label={t.statSold} value={sold.length} color="text-blue-600" iconBg="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>}
          href="/admin/products?tab=sold"/>
        <StatCard label={t.statPaid} value={paid.length} color="text-purple-600" iconBg="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          href="/admin/products?tab=paid"/>
        <StatCard label={t.adminSellers} value={sellers.length} color="text-rose-600" iconBg="bg-rose-50"
          icon={<svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          href="/admin/sellers"/>
      </div>

      {/* ── Pending queue ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">{t.statPending}</h2>
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </div>
        <Link href="/admin/products" className="text-xs font-semibold text-rose-500 hover:underline">
          {t.adminProducts} →
        </Link>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 flex flex-col items-center text-gray-300">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">{t.adminNoProducts}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.slice(0, 8).map((product) => (
            <div key={product._id} className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 p-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {product.photos?.[0]
                    ? <img src={product.photos[0]} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-gray-200"/>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{product.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {product.category} · {product.condition === "new" ? t.conditionNew : t.conditionUsed}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{product.sellerName}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</p>
                  <p className="text-xs text-rose-500 mt-0.5">{t.adminProfitLabel}: {formatPrice(product.profit)}</p>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => approve(product)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {t.adminApprove}
                </button>
                <button onClick={() => router.push(`/admin/products?focus=${product._id}`)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  {t.adminReject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
