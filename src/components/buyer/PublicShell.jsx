import { Link, useLocation } from "@tanstack/react-router";
import * as m from "@/paraglide/messages";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { Button } from "@/components/ui";
import { useState, useRef, useCallback, useEffect } from "react";

function usePathname() { return useLocation({ select: (l) => l.pathname }); }

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

// ── Wordmark ──────────────────────────────────────────────
function Wordmark() {
  return (
    <Link
      to="/"
      dir="ltr"
      aria-label="Dasty2 Mndalan — home"
      className="group inline-flex items-center gap-1.5 shrink-0 select-none"
    >
      <span className="text-lg font-bold text-[var(--color-ember-600)] tracking-tight">Dasty2</span>
      <span className="text-lg font-medium text-[var(--color-ink-soft)]">Mndalan</span>
    </Link>
  );
}

// ── Left nav: logo + seller links when logged in ──────────
function SellerDesktopNav() {
  const { sellerId } = useGlobalSellerSession();
  const pathname = usePathname();

  const isHome    = pathname === "/";
  const isDash    = pathname === "/seller";
  const isAccount = pathname === "/seller/account";

  const linkBase = "hidden sm:flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full transition-all duration-200";

  return (
    <div className="flex items-center gap-2">
      <Wordmark />

      <div className="hidden lg:flex items-center gap-1 ms-2 ps-2 border-s border-[var(--color-hairline)]">
        <Link to="/" className={`${linkBase} ${isHome ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Home
        </Link>
        {sellerId && (
          <Link to="/seller" className={`${linkBase} ${isDash ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
            Dashboard
          </Link>
        )}
        <Link to={sellerId ? "/seller/account" : "/account"} className={`${linkBase} ${isAccount ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-white/60"}`}>
          Account
        </Link>
      </div>
    </div>
  );
}

// ── Header actions — session-aware ────────────────────────
function PlusIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function HeaderActions() {
  const { sellerId, ready }         = useGlobalSellerSession();
  const { isAuthenticated }         = useConvexAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef();

  const notifications = useQuery(
    api.notifications.getBySeller,
    ready && isAuthenticated && sellerId ? { sellerId } : "skip",
  );
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
            <button
              onClick={() => setShowNotifs(v => !v)}
              aria-label="Notifications"
              aria-expanded={showNotifs}
              className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] hover:border-[var(--color-ember-300)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
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

          {/* Sell Now — all screen sizes */}
          <a
            href="/seller/add"
            className="inline-flex items-center justify-center h-7 sm:h-8 ps-2 sm:ps-2.5 pe-2.5 sm:pe-3 text-[10px] sm:text-[11.5px] font-bold tracking-wide gap-0.5 sm:gap-1 rounded-full bg-[#ed0040] hover:bg-[#c80037] text-white transition-all active:scale-[0.98] whitespace-nowrap"
          >
            <PlusIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
            {m.sellNow()}
          </a>
        </>
      ) : (
        <a
          href="/seller/login"
          className="inline-flex items-center justify-center h-8 ps-2.5 pe-3 text-[11.5px] font-bold tracking-wide gap-1 rounded-full bg-[#ed0040] hover:bg-[#c80037] text-white transition-all active:scale-[0.98]"
        >
          <PlusIcon className="w-3 h-3" />
          {m.sellNow()}
        </a>
      )}
    </div>
  );
}

// ── Floating bottom nav ───────────────────────────────────
function SmartBottomNav() {
  const pathname = usePathname();
  const { sellerId, ready } = useGlobalSellerSession();
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

  if (!ready) return null;

  // Product detail page renders its own sticky bottom CTA (WhatsApp).
  // Hide the global nav there so the two don't stack.
  if (pathname.startsWith("/products/")) return null;

  const isHome    = pathname === "/";
  const isAccount = pathname === "/account" || pathname === "/seller/account";
  const isDash    = pathname === "/seller";

  const tab = (active) =>
    `flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-95 ${
      active
        ? "text-[var(--color-ember-600)] bg-[var(--color-ember-50)]"
        : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
    }`;

  // Logged-in sellers: Home / Dashboard / FAB(Sell) / Account
  if (sellerId) {
    return (
      <>
        <div className="lg:hidden h-20 sm:h-24" aria-hidden />
        <nav className="lg:hidden fixed left-1/2 -translate-x-1/2 z-30 bg-white border border-[var(--color-hairline)] rounded-3xl" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-center justify-center gap-8 py-3 px-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <Link to="/" onClick={handleHomeTap} className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-b-2 ${isHome ? "text-[var(--color-ember-600)] border-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] border-transparent"}`}>
              <svg className="w-6 h-6" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <span className="text-[10px] font-semibold">Home</span>
            </Link>

            <Link to="/seller" className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-b-2 ${isDash ? "text-[var(--color-ember-600)] border-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] border-transparent"}`}>
              <svg className="w-6 h-6" fill={isDash ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              <span className="text-[10px] font-semibold">Dashboard</span>
            </Link>

            <Link to="/seller/account" className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-b-2 ${isAccount ? "text-[var(--color-ember-600)] border-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] border-transparent"}`}>
              <svg className="w-6 h-6" fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <span className="text-[10px] font-semibold">Account</span>
            </Link>
          </div>
        </nav>
      </>
    );
  }

  // Anonymous buyer — Home / Account
  return (
    <>
      <div className="lg:hidden h-20 sm:h-24" aria-hidden />
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-30 bg-white border border-[var(--color-hairline)] rounded-3xl mb-4">
        <div className="flex items-center justify-center gap-8 py-3 px-6 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <Link to="/" onClick={handleHomeTap} className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-b-2 ${isHome ? "text-[var(--color-ember-600)] border-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] border-transparent"}`}>
            <svg className="w-6 h-6" fill={isHome ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>

          <Link to="/account" className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border-b-2 ${isAccount ? "text-[var(--color-ember-600)] border-[var(--color-ember-600)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] border-transparent"}`}>
            <svg className="w-6 h-6" fill={isAccount ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span className="text-[10px] font-semibold">Account</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

function HomeScrollRestorer() { return null; }

// ── Shell ─────────────────────────────────────────────────
export default function PublicShell({ children }) {
  return (
    <div className="min-h-screen-dvh flex flex-col">
      {/* Atmospheric backdrop — sits behind everything */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-[320px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(237,0,64,0.06) 0%, rgba(244,245,247,0) 58%)," +
            "radial-gradient(90% 70% at 100% 0%, rgba(11,12,15,0.04) 0%, rgba(244,245,247,0) 55%)",
        }}
      />

      <header className="sticky top-0 z-[70] bg-[var(--color-cream)] border-b border-[var(--color-hairline)] shadow-[0_1px_0_rgba(11,12,15,0.03)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <SellerDesktopNav />
          <HeaderActions />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-7 xl:px-6 pt-3 pb-10 sm:pb-10">
        {children}
      </main>

      <HomeScrollRestorer />
      <SmartBottomNav />

      <footer className="hidden sm:block border-t border-[var(--color-hairline)] bg-white/40 mt-12 py-8">
        <p className="text-center text-sm text-[var(--color-ink-fade)]">
          © {new Date().getFullYear()} <span className="font-display font-semibold"><span className="text-[var(--color-ink)]">Dasty2</span> <span className="text-[var(--color-ember-600)]">Mndalan</span></span> — {m.footerText()}
        </p>
      </footer>
    </div>
  );
}
