"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useState, useRef, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

export default function SellerShell({ children }) {
  const { t } = useT();
  const pathname = usePathname();
  const { sellerId } = useGlobalSellerSession();
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef();

  const notifications = useQuery(api.notifications.getBySeller, sellerId ? { sellerId } : "skip");
  const unread = (notifications ?? []).filter(n => !n.read).length;

  const isHome    = pathname === "/seller";
  const isAccount = pathname === "/seller/account";
  const lastHomeTap = useRef(0);
  const handleHomeTap = useCallback((e) => {
    if (pathname === "/") {
      e.preventDefault(); // never re-navigate when already on home
      const now = Date.now();
      if (now - lastHomeTap.current < 400) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      lastHomeTap.current = now;
    }
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-16 sm:pb-0">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo + desktop nav */}
          <div className="flex items-center gap-2">
            <Link href="/seller" dir="ltr" className="flex items-center gap-1.5 shrink-0">
              <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
              <span className="text-lg font-medium text-gray-600">Mndalan</span>
            </Link>
            <Link href="/"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ms-1 text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Home
            </Link>
            <Link href="/seller"
              className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isHome ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
              Dashboard
            </Link>
            <Link href="/seller/account"
              className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isAccount ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
              Account
            </Link>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button onClick={() => setShowNotifs(v => !v)}
                className="relative p-2 text-gray-500 hover:text-rose-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
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
                  bellRef={bellRef}
                />
              )}
            </div>

            <Link href="/seller/add"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shrink-0">
              + Sell Now
            </Link>

          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* ── Mobile bottom nav — 3 tabs ── */}
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-100 z-20 flex">
        {/* Home */}
        <Link href="/" onClick={handleHomeTap} className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-400 hover:text-rose-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        {/* Dashboard */}
        <Link href="/seller" className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isHome ? "text-rose-600" : "text-gray-400 hover:text-rose-600"}`}>
          <svg className="w-5 h-5" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
          <span className="text-[10px] font-semibold">Dashboard</span>
        </Link>

        {/* Account */}
        <Link href="/seller/account" className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isAccount ? "text-rose-600" : "text-gray-400 hover:text-rose-600"}`}>
          <svg className="w-5 h-5" fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span className="text-[10px] font-semibold">Account</span>
        </Link>
      </nav>
    </div>
  );
}
