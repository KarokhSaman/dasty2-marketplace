"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

// ── Left nav: logo + seller links when logged in ──────────
function SellerDesktopNav() {
  const { sellerId } = useGlobalSellerSession();
  const pathname = usePathname();

  const isHome    = pathname === "/";
  const isDash    = pathname === "/seller";
  const isAccount = pathname === "/seller/account";

  return (
    <div className="flex items-center gap-2">
      <Link href="/" dir="ltr" className="flex items-center gap-1.5 shrink-0">
        <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
        <span className="text-lg font-medium text-gray-600">Mndalan</span>
      </Link>

      {sellerId && (
        <>
          <Link href="/"
            className={`hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ms-1 transition-colors ${isHome ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            Home
          </Link>
          <Link href="/seller"
            className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isDash ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
            Dashboard
          </Link>
          <Link href="/seller/account"
            className={`hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isAccount ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-50"}`}>
            Account
          </Link>
        </>
      )}
    </div>
  );
}

// ── Header actions — session-aware ────────────────────────
function HeaderActions({ t }) {
  const { sellerId, ready }         = useGlobalSellerSession();
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef();

  const notifications = useQuery(api.notifications.getBySeller, sellerId ? { sellerId } : "skip");
  const unread = (notifications ?? []).filter(n => !n.read).length;

  if (!ready) {
    return (
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher />

      {sellerId ? (
        <>
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

          {/* Sell Now — rightmost corner */}
          <Link href="/seller/add"
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shrink-0">
            + Sell Now
          </Link>
        </>
      ) : (
        /* Anonymous buyer — Sell Now links to login/onboarding */
        <Link href="/seller/login"
          className="text-sm font-medium bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors">
          {t.sellNow}
        </Link>
      )}
    </div>
  );
}

// ── Smart bottom nav ──────────────────────────────────────
function SmartBottomNav() {
  const pathname = usePathname();
  const { sellerId, ready } = useGlobalSellerSession();
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

  if (!ready) return null;

  const isHome    = pathname === "/";
  const isAccount = pathname === "/account" || pathname === "/seller/account";
  const isDash    = pathname === "/seller";

  if (sellerId) {
    return (
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-100 z-30 flex shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <Link href="/" onClick={handleHomeTap} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isHome ? "text-rose-600" : "text-gray-400"}`}>
          <svg className="w-5 h-5" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        <Link href="/seller" className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isDash ? "text-rose-600" : "text-gray-400"}`}>
          <svg className="w-5 h-5" fill={isDash ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
          <span className="text-[10px] font-semibold">Dashboard</span>
        </Link>

        <Link href="/seller/account" className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isAccount ? "text-rose-600" : "text-gray-400"}`}>
          <svg className="w-5 h-5" fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span className="text-[10px] font-semibold">Account</span>
        </Link>
      </nav>
    );
  }

  // Anonymous buyer — 2 tabs
  return (
    <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-100 z-30 flex shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
      <Link href="/" onClick={handleHomeTap} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isHome ? "text-rose-600" : "text-gray-400"}`}>
        <svg className="w-5 h-5" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <span className="text-[10px] font-semibold">Home</span>
      </Link>

      <Link href="/account" className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${isAccount ? "text-rose-600" : "text-gray-400"}`}>
        <svg className="w-5 h-5" fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
        <span className="text-[10px] font-semibold">Account</span>
      </Link>
    </nav>
  );
}

// ── Scroll restoration — lives in shell so it fires on every nav ──
function HomeScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const y    = sessionStorage.getItem("dasty2-home-scroll");
    const catX = sessionStorage.getItem("dasty2-catbar-scroll");

    if (y)    sessionStorage.removeItem("dasty2-home-scroll");
    if (catX) sessionStorage.removeItem("dasty2-catbar-scroll");

    if (!y && !catX) return;

    const t = setTimeout(() => {
      if (y) window.scrollTo({ top: Number(y), behavior: "instant" });
      if (catX) {
        const catBar = document.querySelector("[data-catbar]");
        if (catBar) catBar.scrollLeft = Number(catX);
      }
    }, 100);

    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}

// ── Shell ─────────────────────────────────────────────────
export default function PublicShell({ children }) {
  const { t } = useT();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: logo + seller desktop nav */}
          <SellerDesktopNav />
          {/* Right: locale, bell, sell now */}
          <HeaderActions t={t} />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      <HomeScrollRestorer />
      <SmartBottomNav />

      <footer className="hidden sm:block border-t border-gray-200 bg-white mt-12 py-6">
        <p className="text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Dasty2 Mndalan — {t.footerText}
        </p>
      </footer>
    </div>
  );
}
