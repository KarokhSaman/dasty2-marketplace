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
  const isAdmins    = pathname.startsWith("/admin/admins");
  const isOffers    = pathname.startsWith("/admin/offers");

  const navTabs = [
    {
      href: "/admin", active: isDashboard, label: m.adminDashboard(), shortLabel: "Dashboard",
      icon: (a) => (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      href: "/admin/products", active: isProducts, label: m.adminProducts(), shortLabel: "Products",
      icon: (a) => (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
      ),
    },
    {
      href: "/admin/sellers", active: isSellers, label: m.adminSellers(), shortLabel: "Sellers",
      icon: (a) => (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      ),
    },
    {
      href: "/admin/admins", active: isAdmins, label: "Admins", shortLabel: "Admins",
      icon: (a) => (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-5.5A11.95 11.95 0 0112 2.75 11.95 11.95 0 014 4.5v6.75c0 5.05 3.4 9.75 8 10.95 4.6-1.2 8-5.9 8-10.95V4.5z"/>
        </svg>
      ),
    },
    {
      href: "/admin/offers", active: isOffers, label: m.adminOffers(), shortLabel: "Offers",
      icon: (a) => (
        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill={a ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Atmospheric backdrop */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-[320px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(237,0,64,0.06) 0%, rgba(244,245,247,0) 58%)," +
            "radial-gradient(90% 70% at 100% 0%, rgba(11,12,15,0.04) 0%, rgba(244,245,247,0) 55%)",
        }}
      />

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[var(--color-cream)] border-b border-[var(--color-hairline)] shadow-[0_1px_0_rgba(11,12,15,0.02)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-2">
            <Link to="/admin" dir="ltr" className="group inline-flex items-center gap-1.5 shrink-0 select-none">
              <span className="text-lg font-bold text-[var(--color-ember-600)] tracking-tight">Dasty2</span>
              <span className="text-lg font-medium text-[var(--color-ink-soft)]">Mndalan</span>
            </Link>
            <div className="hidden xl:flex items-center gap-1 ms-2 ps-2 border-s border-[var(--color-hairline)]">
              {navTabs.map(tab => (
                <Link key={tab.href} to={tab.href}
                  className={`text-sm font-medium px-3.5 py-2 rounded-full transition-all duration-200 ${
                    tab.active ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"
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
                aria-label="Notifications"
                aria-expanded={showNotifs}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] hover:border-[var(--color-ember-300)] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[1rem] h-4 px-1 text-[9.5px] font-bold bg-[var(--color-ember-500)] text-white rounded-full flex items-center justify-center ring-2 ring-[var(--color-cream)]">
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
                className="w-8 h-8 rounded-full bg-[var(--color-ember-600)] flex items-center justify-center text-white text-sm font-bold hover:bg-[var(--color-ember-700)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-400)] focus:ring-offset-2"
              >
                {adminEmail ? adminEmail[0].toUpperCase() : "A"}
              </button>

              {showProfile && (
                <div className="absolute end-0 top-10 w-52 bg-white rounded-xl shadow-lg border border-[var(--color-hairline)] overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-[var(--color-hairline)]">
                    <p className="text-[10px] text-[var(--color-ink-fade)] uppercase tracking-widest font-semibold mb-0.5">Signed in as</p>
                    <p className="text-xs font-semibold text-[var(--color-ink)] truncate" dir="ltr">{adminEmail || "Admin"}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--color-ember-600)] hover:bg-[var(--color-ember-50)] transition-colors font-medium"
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-7 xl:px-6 pt-3 pb-10 xl:pb-10">
        {isAuthenticated ? children : authTimedOut ? (
          <div className="mx-auto max-w-md py-20 text-center space-y-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{m.errSessionExpired()}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-ink)] px-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {m.adminSignOut()}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-2 border-[var(--color-ember-200)] border-t-[var(--color-ember-500)] rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav — iPad optimization ── */}
      <div className="lg:hidden h-28 sm:h-32" aria-hidden />
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md surface-frost rounded-[1.75rem] border border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(11,12,15,0.22)] px-2 py-1.5 flex items-stretch gap-1">
          {navTabs.map(tab => (
            <Link key={tab.href} to={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-2xl transition-all duration-200 active:scale-95 ${
                tab.active
                  ? "text-[var(--color-ember-600)] bg-[var(--color-ember-50)]"
                  : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              }`}>
              <div className="w-4 h-4 sm:w-5 sm:h-5">{tab.icon(tab.active)}</div>
              <span className="text-[9px] sm:text-xs font-semibold leading-tight">{tab.shortLabel}</span>
            </Link>
          ))}
        </div>
      </nav>

    </div>
  );
}
