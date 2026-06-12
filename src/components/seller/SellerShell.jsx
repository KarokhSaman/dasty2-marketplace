import { Link, useLocation, useNavigate } from "@tanstack/react-router";
const usePathname = () => useLocation({ select: (l) => l.pathname });
import { useQuery, useConvexAuth } from "convex/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { Button } from "@/components/ui";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

// ── Wordmark — clean sans, matches the buyer header ───────
function Wordmark() {
  return (
    <Link
      to="/seller"
      dir="ltr"
      aria-label="Dasty2 Mndalan"
      className="group inline-flex items-center gap-1.5 shrink-0 select-none"
    >
      <span className="text-lg font-bold text-[var(--color-ember-600)] tracking-tight">Dasty2</span>
      <span className="text-lg font-medium text-[var(--color-ink-soft)]">Mndalan</span>
    </Link>
  );
}

function PlusIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function SellerShell({ children }) {
  const pathname = usePathname();
  const { sellerId, setSellerId } = useGlobalSellerSession();
  const { isSignedIn } = useAuth();
  // Convex websocket auth state — authed queries must wait for this, otherwise
  // they run during the handshake, throw "Not authenticated", and crash the page.
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const bellRef = useRef();

  // When Clerk invalidates the session (e.g. admin deleted the account),
  // clear context and navigate to login immediately so the shell doesn't linger.
  useEffect(() => {
    if (isSignedIn === false) {
      setSellerId(null);
      fetch("/api/seller/logout", { method: "POST" }).catch(() => {});
      navigate({ to: "/seller/login", replace: true });
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || isAuthenticated) {
      setAuthTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => setAuthTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isSignedIn, isAuthenticated]);

  const handleAuthReset = useCallback(() => {
    setSellerId(null);
    fetch("/api/seller/logout", { method: "POST" }).finally(() => {
      navigate({ to: "/seller/login", replace: true });
    });
  }, [navigate, setSellerId]);

  const notifications = useQuery(api.notifications.getBySeller, isAuthenticated && sellerId ? { sellerId } : "skip");
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  const isHomeTab = pathname === "/";
  const isDash = pathname === "/seller";
  const isAccount = pathname === "/seller/account";
  const isAddProduct = pathname === "/seller/add" || pathname.includes("/seller/repost/") || pathname.includes("/seller/products/") && pathname.includes("/edit");
  const lastHomeTap = useRef(0);

  const handleHomeTap = useCallback((e) => {
    if (pathname === "/") {
      e.preventDefault();
      const now = Date.now();
      if (now - lastHomeTap.current < 400) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      lastHomeTap.current = now;
    }
  }, [pathname]);

  const navLink = "hidden sm:flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full transition-all duration-200";
  const tab = (active) =>
    `flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-95 ${
      active ? "text-[var(--color-ember-600)] bg-[var(--color-ember-50)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
    }`;

  return (
    <div className="min-h-screen-dvh flex flex-col">
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
      <header className="sticky top-0 z-[70] bg-[var(--color-cream)] border-b border-[var(--color-hairline)] shadow-[0_1px_0_rgba(11,12,15,0.02)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wordmark />
            <div className="hidden lg:flex items-center gap-1 ms-2 ps-2 border-s border-[var(--color-hairline)]">
              <Link to="/" className={`${navLink} text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {m.navHome()}
              </Link>
              <Link to="/seller" className={`${navLink} ${isDash ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
                {m.sellerDashboard()}
              </Link>
              <Link to="/seller/account" className={`${navLink} ${isAccount ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
                {m.navAccount()}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />

            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowNotifs((v) => !v)}
                aria-label="Notifications"
                aria-expanded={showNotifs}
                className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] hover:border-[var(--color-ember-300)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[1rem] h-4 px-1 text-[9.5px] font-bold bg-[var(--color-ember-500)] text-white rounded-full flex items-center justify-center ring-2 ring-[var(--color-cream)]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {showNotifs && sellerId && (
                <NotificationPanel
                  notifications={notifications ?? []}
                  sellerId={sellerId}
                  label={m.sellerNotifications()}
                  onClose={() => setShowNotifs(false)}
                  bellRef={bellRef}
                />
              )}
            </div>

            {!isAddProduct && (
              <a
                href="/seller/add"
                className="inline-flex items-center justify-center h-7 sm:h-8 ps-2 sm:ps-2.5 pe-2.5 sm:pe-3 text-[10px] sm:text-[11.5px] font-bold tracking-wide gap-0.5 sm:gap-1 rounded-full bg-[#ed0040] hover:bg-[#c80037] text-white transition-all active:scale-[0.98] whitespace-nowrap"
              >
                <PlusIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                {m.sellNow()}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-7 xl:px-6 pt-3 pb-10">
        {/* Hold child pages (and their authed queries) until the Convex
            websocket is authenticated — server already gated via requireSellerFn. */}
        {isAuthenticated ? children : authTimedOut ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{m.errSessionExpired()}</p>
            <Button variant="ink" size="sm" onClick={handleAuthReset}>
              {m.loginTitle()}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-2 border-[var(--color-ember-200)] border-t-[var(--color-ember-500)] rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav — Home / Dashboard / Account ── */}
      {!isAddProduct && (
        <>
          <div className="lg:hidden h-20 sm:h-24" aria-hidden />
          <nav className="lg:hidden fixed inset-x-0 z-30 bg-white/70 backdrop-blur-md border-t border-white/50" style={{ bottom: 0 }}>
        <div className="flex items-center w-full py-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link to="/" onClick={handleHomeTap} className={`flex flex-1 flex-col items-center gap-1 transition-all`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${isHomeTab ? "bg-[var(--color-ember-50)]" : ""}`}>
              <svg className={`w-6 h-6 transition-all ${isHomeTab ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`} fill={isHomeTab ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isHomeTab ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`}>{m.navHome()}</span>
          </Link>

          <Link to="/seller" className={`flex flex-1 flex-col items-center gap-1 transition-all`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${isDash ? "bg-[var(--color-ember-50)]" : ""}`}>
              <svg className={`w-6 h-6 transition-all ${isDash ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`} fill={isDash ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isDash ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`}>{m.sellerDashboard()}</span>
          </Link>

          <Link to="/seller/account" className={`flex flex-1 flex-col items-center gap-1 transition-all`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${isAccount ? "bg-[var(--color-ember-50)]" : ""}`}>
              <svg className={`w-6 h-6 transition-all ${isAccount ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`} fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className={`text-[9px] font-semibold transition-all ${isAccount ? "text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)]"}`}>{m.navAccount()}</span>
          </Link>
        </div>
          </nav>
        </>
      )}
    </div>
  );
}
