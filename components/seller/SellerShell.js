"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { clearSellerSession } from "@/lib/useSellerSession";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";

export default function SellerShell({ children }) {
  const { t } = useT();
  const pathname = usePathname();
  const [sellerId, setSellerId] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    fetch("/api/seller/me").then(r => r.json()).then(d => setSellerId(d.sellerId ?? null));
  }, []);

  const notifications = useQuery(
    api.notifications.getBySeller,
    sellerId ? { sellerId } : "skip"
  );
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  async function handleSignOut() {
    await clearSellerSession();
    window.location.href = "/";
  }

  const isHome  = pathname === "/seller";
  const isAdd   = pathname === "/seller/add";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-16 sm:pb-0">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          {/* Logo */}
          <Link href="/seller" dir="ltr" className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
            <span className="text-lg font-medium text-gray-600">Mndalan</span>
          </Link>

          {/* Desktop nav */}
          <Link href="/seller"
            className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ms-2 ${isHome ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
            {t.sellerDashboard}
          </Link>
          <Link href="/seller/add"
            className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isAdd ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
            + {t.sellerAddProduct}
          </Link>
          <Link href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            {t.browseShop}
          </Link>

          <div className="flex-1" />

          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="relative p-2 text-gray-500 hover:text-rose-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute top-1 end-1 min-w-[1.1rem] h-[1.1rem] text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {showNotifs && sellerId && (
              <NotificationPanel
                notifications={notifications ?? []}
                sellerId={sellerId}
                label={t.sellerNotifications}
                onClose={() => setShowNotifs(false)}
              />
            )}
          </div>

          <LocaleSwitcher />

          {/* Sign out — desktop only (mobile uses bottom nav) */}
          <button
            onClick={handleSignOut}
            className="hidden sm:block text-xs text-gray-500 hover:text-rose-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            {t.sellerSignOut}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-200 z-20 flex">
        <Link
          href="/seller"
          className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
            isHome ? "text-rose-600" : "text-gray-400"
          }`}
        >
          <svg className="w-5 h-5" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">{t.sellerDashboard}</span>
        </Link>

        <Link
          href="/"
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-400 hover:text-rose-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
          <span className="text-[10px] font-medium">{t.browseShop}</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-400 hover:text-rose-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-medium">{t.sellerSignOut}</span>
        </button>
      </nav>
    </div>
  );
}
