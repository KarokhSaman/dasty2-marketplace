"use client";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useT();
  const router = useRouter();

  const products  = useQuery(api.products.getAll);
  const sellers   = useQuery(api.sellers.getAll);
  const updateStatus   = useMutation(api.products.updateStatus);
  const createNotif    = useMutation(api.notifications.create);

  if (!products || !sellers) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  const pending  = products.filter((p) => p.status === "pending");
  const approved = products.filter((p) => p.status === "approved");
  const sold     = products.filter((p) => p.status === "sold");
  const paid     = products.filter((p) => p.status === "paid");

  const totalEarned  = paid.reduce((s, p) => s + (p.profit ?? 0), 0);
  const pendingPayout = sold.reduce((s, p) => s + (p.profit ?? 0), 0);

  async function approve(product) {
    await updateStatus({
      id: product._id,
      status: "approved",
      approvedBy: "admin",
      approvedAt: new Date().toISOString(),
    });
    await createNotif({
      sellerId: product.sellerId,
      productId: product._id,
      message: t.adminApproveMsg(product.title),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.adminDashboard}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label={t.statTotal}    value={products.length} color="text-gray-800" />
        <StatCard label={t.statPending}  value={pending.length}  color="text-yellow-600" />
        <StatCard label={t.statApproved} value={approved.length} color="text-green-600" />
        <StatCard label={t.statSold}     value={sold.length}     color="text-blue-600" />
        <StatCard label={t.statPaid}     value={paid.length}     color="text-purple-600" />
        <StatCard label={t.adminSellers} value={sellers.length}  color="text-rose-600" />
      </div>

      {/* Profit summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
          <p className="text-xs text-green-600 font-medium mb-1">{t.adminTotalEarned}</p>
          <p className="text-2xl font-bold text-green-700">{formatPrice(totalEarned)}</p>
          <p className="text-xs text-green-500 mt-1">{paid.length} {t.statPaid.toLowerCase()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
          <p className="text-xs text-amber-600 font-medium mb-1">{t.adminPendingPayout}</p>
          <p className="text-2xl font-bold text-amber-700">{formatPrice(pendingPayout)}</p>
          <p className="text-xs text-amber-500 mt-1">{sold.length} {t.statSold.toLowerCase()}</p>
        </div>
      </div>

      {/* Pending approval queue */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {t.statPending}
          {pending.length > 0 && (
            <span className="ms-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>
        <Link href="/admin/products" className="text-xs text-rose-500 hover:underline">
          {t.adminProducts} →
        </Link>
      </div>

      {pending.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-12 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-400">{t.adminNoProducts}</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.slice(0, 8).map((product) => (
          <div key={product._id} className="bg-white rounded-xl border border-yellow-100 overflow-hidden">
            {/* Info row */}
            <div className="flex items-start gap-3 p-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {product.photos?.[0]
                  ? <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-200" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{product.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {product.category} · {product.condition === "new" ? t.conditionNew : t.conditionUsed}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{product.sellerName}</p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</p>
                <p className="text-xs text-rose-500 mt-0.5">
                  {t.adminProfitLabel}: {formatPrice(product.profit)}
                </p>
              </div>
            </div>
            {/* Action row */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => approve(product)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {t.adminApprove}
              </button>
              <button
                onClick={() => router.push(`/admin/products?focus=${product._id}`)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {t.adminReject}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
