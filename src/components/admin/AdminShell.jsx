import { Link, useLocation } from "@tanstack/react-router";
const usePathname = () => useLocation({ select: (l) => l.pathname });
import { useState, useRef, useEffect } from "react";
import { useClerk } from "@clerk/tanstack-react-start";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";

const ADMIN_ID = "ADMIN";

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const bellRef = useRef();
  const profileRef = useRef();
  const { signOut } = useClerk();
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? ""));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => setAuthTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showProfile) return;
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProfile]);

  const notifications = useQuery(
    api.notifications.getBySeller,
    isAuthenticated ? { sellerId: ADMIN_ID } : "skip",
  );
  const unread = (notifications ?? []).filter(n => !n.read).length;

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    await signOut();
    window.location.href = "/admin/login";
  }

  const isDashboard = pathname === "/admin";
  const isProducts  = pathname.startsWith("/admin/products");
  const isSellers   = pathname.startsWith("/admin/sellers");
  const isOffers    = pathname.startsWith("/admin/offers");

  const navTabs = [
    {
      href: "/admin", active: isDashboard, label: m.adminDashboard(), shortLabel: "Dashboard",
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      href: "/admin/products", active: isProducts, label: m.adminProducts(), shortLabel: "Products",
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
      ),
    },
    {
      href: "/admin/sellers", active: isSellers, label: m.adminSellers(), shortLabel: "Sellers",
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      ),
    },
    {
      href: "/admin/offers", active: isOffers, label: m.adminOffers(), shortLabel: "Offers",
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

            {/* Profile avatar + dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(v => !v)}
                className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white text-sm font-bold hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
              >
                {adminEmail ? adminEmail[0].toUpperCase() : "A"}
              </button>

              {showProfile && (
                <div className="absolute end-0 top-10 w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Signed in as</p>
                    <p className="text-xs font-semibold text-gray-800 truncate" dir="ltr">{adminEmail || "Admin"}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    {m.adminSignOut()}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {isAuthenticated ? children : authTimedOut ? (
          <div className="mx-auto max-w-md py-20 text-center space-y-4">
            <p className="text-sm font-medium text-gray-700">{m.errSessionExpired()}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {m.adminSignOut()}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-rose-500" />
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="sm:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-100 z-20 flex">
        {navTabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              tab.active ? "text-rose-600" : "text-gray-400"
            }`}>
            {tab.icon(tab.active)}
            <span className="text-[10px] font-semibold leading-none">{tab.shortLabel}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
