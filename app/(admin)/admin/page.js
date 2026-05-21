"use client";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

// ── Stats panel (mirrors seller dashboard layout) ──────────
function StatsPanel({ products, sellers, pending, approved, sold, paid, t }) {
  return (
    <div className="space-y-3 mb-6">
      {/* Revenue gradient cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/products?tab=paid"
          className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-4 relative overflow-hidden block">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full"/>
          <p className="text-[11px] font-semibold text-green-100 uppercase tracking-widest mb-1">{t.adminTotalEarned}</p>
          <p className="text-3xl font-bold text-white leading-none">
            {formatPrice(paid.reduce((s, p) => s + (p.profit ?? 0), 0))}
          </p>
          <p className="text-[11px] text-green-100 mt-2">{paid.length} {t.statPaid.toLowerCase()}</p>
        </Link>

        <Link href="/admin/products?tab=sold"
          className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-4 relative overflow-hidden block">
          <div className="absolute -top-3 -end-3 w-16 h-16 bg-white/10 rounded-full"/>
          <p className="text-[11px] font-semibold text-amber-100 uppercase tracking-widest mb-1">{t.adminPendingPayout}</p>
          <p className="text-3xl font-bold text-white leading-none">
            {formatPrice(sold.reduce((s, p) => s + (p.profit ?? 0), 0))}
          </p>
          <p className="text-[11px] text-amber-100 mt-2">{sold.length} {t.statSold.toLowerCase()}</p>
        </Link>
      </div>

      {/* Secondary metrics strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex divide-x divide-gray-100 overflow-hidden">
        {[
          { label: t.statTotal,    value: products.length, color: "text-gray-800",   href: "/admin/products?tab=all" },
          { label: t.statPending,  value: pending.length,  color: "text-amber-600",  href: "/admin/products?tab=pending" },
          { label: t.statApproved, value: approved.length, color: "text-green-600",  href: "/admin/products?tab=approved" },
          { label: t.adminSellers, value: sellers.length,  color: "text-rose-600",   href: "/admin/sellers" },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="flex-1 flex flex-col items-center py-3.5 gap-0.5 hover:bg-gray-50 transition-colors">
            <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
            <span className="text-[10px] text-gray-400 font-medium leading-tight text-center px-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useT();
  const router = useRouter();

  const products     = useQuery(api.products.getAll);
  const sellers      = useQuery(api.sellers.getAll);
  const updateStatus = useMutation(api.products.updateStatus);
  const createNotif  = useMutation(api.notifications.create);
  const createLog    = useMutation(api.adminLogs.create);

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? "admin"));
  }, []);

  if (!products || !sellers) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 bg-gray-200 rounded-2xl"/>
          <div className="h-28 bg-gray-200 rounded-2xl"/>
        </div>
        <div className="h-16 bg-gray-200 rounded-2xl"/>
        <div className="h-8 bg-gray-200 rounded w-40"/>
        <div className="space-y-3">
          {Array.from({length:3}).map((_,i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl"/>)}
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

  async function approve(product) {
    await updateStatus({ id: product._id, status: "approved", approvedBy: adminEmail, approvedAt: new Date().toISOString() });
    await createNotif({ sellerId: product.sellerId, productId: product._id, message: t.adminApproveMsg(product.title), url: `/products/${product._id}` });
    await createLog({ adminEmail, action: "approved", productId: product._id.toString(), productTitle: product.title, sellerName: product.sellerName, price: product.price });
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t.adminDashboard}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* ── Stats ── */}
      <StatsPanel
        products={products} sellers={sellers}
        pending={pending} approved={approved} sold={sold} paid={paid}
        t={t}
      />

      {/* ── Pending queue ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800">{t.statPending}</h2>
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>
        <Link href="/admin/products" className="text-xs font-semibold text-rose-500 hover:underline">
          {t.adminProducts} →
        </Link>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 flex flex-col items-center text-gray-300">
          <svg className="w-10 h-10 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm font-medium text-gray-400">{t.adminNoProducts}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.slice(0, 8).map(product => (
            <div key={product._id} className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-3.5">
                {/* Photo */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {product.photos?.[0]
                    ? <img src={product.photos[0]} alt="" className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-gray-200"/>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{product.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {product.category} · {product.condition === "new" ? t.conditionNew : t.conditionUsed}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{product.sellerName}</p>
                </div>

                {/* Price */}
                <div className="text-end shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</p>
                  <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
                    {t.adminProfitLabel}: {formatPrice(product.profit)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 px-3.5 pb-3.5">
                <button onClick={() => approve(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                  {t.adminApprove}
                </button>
                <button onClick={() => router.push(`/admin/products?focus=${product._id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2.5 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
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
