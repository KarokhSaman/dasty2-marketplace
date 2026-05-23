import { Link, useLocation } from "@tanstack/react-router";
const usePathname = () => useLocation({ select: (l) => l.pathname });
import { useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/src/paraglide/messages";
import LocaleSwitcher from "@/src/components/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";

const ADMIN_ID = "ADMIN";

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef();

  const notifications = useQuery(api.notifications.getBySeller, { sellerId: ADMIN_ID });
  const unread = (notifications ?? []).filter(n => !n.read).length;

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const isDashboard = pathname === "/admin";
  const isProducts  = pathname.startsWith("/admin/products");
  const isSellers   = pathname.startsWith("/admin/sellers");
  const isOffers    = pathname.startsWith("/admin/offers");

  const navTabs = [
    {
      href: "/admin", active: isDashboard, label: m.adminDashboard(),
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      href: "/admin/products", active: isProducts, label: m.adminProducts(),
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
      ),
    },
    {
      href: "/admin/sellers", active: isSellers, label: m.adminSellers(),
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      ),
    },
    {
      href: "/admin/offers", active: isOffers, label: "Offers",
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-16 sm:pb-0">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-2">
            <Link to="/admin" dir="ltr" className="flex items-center gap-1.5 shrink-0">
              <span className="text-lg font-bold text-rose-600 tracking-tight">Dasty2</span>
              <span className="text-lg font-medium text-gray-600">Mndalan</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1 ms-1">
              {navTabs.map(tab => (
                <Link key={tab.href} href={tab.href}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    tab.active ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}>
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />

            {/* Bell */}
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

            {/* Sign out — desktop text, mobile icon */}
            <button onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-gray-50"
              title={m.adminSignOut()}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-100 z-20 flex">
        {navTabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              tab.active ? "text-rose-600" : "text-gray-400"
            }`}>
            {tab.icon(tab.active)}
            <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
