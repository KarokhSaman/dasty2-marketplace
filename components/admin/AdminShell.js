"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";

const ADMIN_ID = "ADMIN";

function DesktopNavLink({ href, children, active }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
        active ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

function BottomTab({ href, label, active, icon }) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
        active ? "text-rose-600" : "text-gray-400"
      }`}
    >
      {icon(active)}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

export default function AdminShell({ children }) {
  const { t } = useT();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef();

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? ""));
  }, []);

  const notifications = useQuery(api.notifications.getBySeller, { sellerId: ADMIN_ID });
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const isDashboard = pathname === "/admin";
  const isProducts  = pathname.startsWith("/admin/products");
  const isSellers   = pathname.startsWith("/admin/sellers");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-16 sm:pb-0">

      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2">

          {/* Logo */}
          <Link href="/admin" dir="ltr" className="flex items-center gap-1.5 shrink-0 me-1">
            <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
            <span className="text-lg font-medium text-gray-600">Mndalan</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            <DesktopNavLink href="/admin"          active={isDashboard}>{t.adminDashboard}</DesktopNavLink>
            <DesktopNavLink href="/admin/products" active={isProducts}>{t.adminProducts}</DesktopNavLink>
            <DesktopNavLink href="/admin/sellers"  active={isSellers}>{t.adminSellers}</DesktopNavLink>
          </div>

          <div className="flex-1" />

          {/* Admin email — desktop only */}
          {adminEmail && (
            <span className="hidden lg:block text-xs text-gray-400 truncate max-w-[140px]" dir="ltr">
              {adminEmail}
            </span>
          )}

          {/* Bell */}
          <div ref={bellRef} className="relative">
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
            {showNotifs && (
              <NotificationPanel
                notifications={notifications ?? []}
                sellerId={ADMIN_ID}
                label="Notifications"
                onClose={() => setShowNotifs(false)}
                bellRef={bellRef}
              />
            )}
          </div>

          <LocaleSwitcher />

          {/* Sign out — desktop only */}
          <button
            onClick={handleSignOut}
            className="hidden sm:block text-xs text-gray-500 hover:text-rose-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.adminSignOut}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* ── Mobile bottom nav (4 tabs) ───────────────────── */}
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-200 z-20 flex">

        {/* Dashboard */}
        <BottomTab
          href="/admin" active={isDashboard} label={t.adminDashboard}
          icon={(a) => (
            <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )}
        />

        {/* Products */}
        <BottomTab
          href="/admin/products" active={isProducts} label={t.adminProducts}
          icon={(a) => (
            <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          )}
        />

        {/* Sellers */}
        <BottomTab
          href="/admin/sellers" active={isSellers} label={t.adminSellers}
          icon={(a) => (
            <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-400 hover:text-rose-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-medium leading-none">{t.adminSignOut}</span>
        </button>

      </nav>
    </div>
  );
}
