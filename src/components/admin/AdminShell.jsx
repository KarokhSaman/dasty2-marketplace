import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { LanguagePicker } from "@/components/LocaleSwitcher";
import { logoAnimationStyles, useLogoAnimation } from "@/components/buyer/PublicShell";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { Panel, ToastProvider, IconChevron } from "@/components/admin/ui";

const ADMIN_ID = "ADMIN";

const Icon = ({ children, filled }) => (
  <svg className="w-[22px] h-[22px] lg:w-[19px] lg:h-[19px]" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} fillOpacity={filled ? 0.12 : 1}
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  todo: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" /></>,
  products: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  sellers: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3" /></>,
  fees: <><rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12.5" r="2.5" /><path d="M6 10v.01M18 15v.01" /></>,
  offers: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  logs: <><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></>,
  admins: <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6Z" /><path d="m9 12 2 2 4-4" /></>,
  more: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
};

function Badge({ children, hot }) {
  if (!children) return null;
  return (
    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center tabular-nums ${
      hot ? "bg-adm-accent text-white" : "bg-adm-sunk text-adm-soft"}`}>
      {children}
    </span>
  );
}

function Logo() {
  const animate = useLogoAnimation();
  return (
    <Link to="/admin" dir="ltr" className="inline-flex items-center gap-1.5 shrink-0 select-none" aria-label="Mndallan admin">
      <style>{logoAnimationStyles}</style>
      <img src="/logo-mndallan.svg" alt="" className={`adm-logo w-9 h-9 ${animate ? "logo-image-animate" : ""}`} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold text-adm-accent tracking-tight">Mndallan</span>
        <span className="text-[10px] font-semibold text-adm-fade mt-0.5">Admin</span>
      </span>
    </Link>
  );
}

export default function AdminShell({ children }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { isAuthenticated } = useConvexAuth();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const bellRef = useRef();
  const bellRefDesk = useRef();

  const me = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");
  const products = useQuery(api.products.getAll, isAuthenticated ? {} : "skip");
  const activeOffer = useQuery(api.offers.getActive, isAuthenticated ? {} : "skip");
  const notifications = useQuery(api.notifications.getBySeller, isAuthenticated ? { sellerId: ADMIN_ID } : "skip");
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    if (isAuthenticated) { setAuthTimedOut(false); return; }
    const t = window.setTimeout(() => setAuthTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, [isAuthenticated]);

  useEffect(() => { setMoreOpen(false); setShowNotifs(false); }, [pathname]);

  const counts = useMemo(() => {
    const list = products ?? [];
    const decide = list.filter((p) => p.status === "pending" || p.status === "deletion_requested" || (p.status === "approved" && p.soldReportedAt)).length;
    const owing = new Set(list.filter((p) => p.status === "sold").map((p) => p.sellerId)).size;
    return { decide, owing };
  }, [products]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const is = (href) => (href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href));
  const nav = [
    { href: "/admin", key: "todo", label: "To do", badge: counts.decide, hot: true },
    { href: "/admin/products", key: "products", label: m.adminProducts() },
    { href: "/admin/sellers", key: "sellers", label: m.adminSellers() },
    { href: "/admin/fees", key: "fees", label: "Fees", long: "Fees to collect", badge: counts.owing, hot: true },
    { href: "/admin/offers", key: "offers", label: m.adminOffers(), badge: activeOffer ? "Live" : null, extra: true },
    { href: "/admin/logs", key: "logs", label: "Admin log", extra: true },
    { href: "/admin/admins", key: "admins", label: "Admins", extra: true },
  ];
  const moreActive = nav.some((n) => n.extra && is(n.href));

  const bell = (ref) => (
    <div ref={ref} className="relative">
      <button onClick={() => setShowNotifs((v) => !v)} aria-label="Notifications" aria-expanded={showNotifs}
        className="relative w-10 h-10 rounded-xl border border-adm-line bg-adm-surface grid place-items-center text-adm-soft hover:text-adm-ink">
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-adm-accent text-white text-[10px] font-bold grid place-items-center ring-2 ring-adm-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {showNotifs && (
        <NotificationPanel notifications={notifications ?? []} sellerId={ADMIN_ID} label="Notifications" onClose={() => setShowNotifs(false)} bellRef={ref} />
      )}
    </div>
  );

  return (
    <ToastProvider>
      <div className="admin-root adm-scope min-h-screen-dvh bg-adm-bg text-adm-ink">
        {/* ── Laptop: side menu ── */}
        <aside className="hidden lg:flex fixed inset-y-0 start-0 w-[232px] flex-col gap-0.5 bg-adm-surface border-e border-adm-line px-3 py-4 z-40">
          <div className="px-2 pb-5"><Logo /></div>
          {nav.map((n) => (
            <Link key={n.href} to={n.href}
              className={`flex items-center gap-3 h-10 px-3 rounded-xl text-[13.5px] font-semibold transition-colors ${
                is(n.href) ? "bg-adm-accent-soft text-adm-accent" : "text-adm-soft hover:bg-adm-sunk hover:text-adm-ink"}`}>
              <Icon filled={is(n.href)}>{ICONS[n.key]}</Icon>
              <span className="flex-1 truncate">{n.long ?? n.label}</span>
              <Badge hot={n.hot || n.key === "offers"}>{n.badge}</Badge>
            </Link>
          ))}
          <div className="mt-auto pt-3 border-t border-adm-line space-y-2">
            <LanguagePicker />
            <div className="px-2 text-[11.5px] text-adm-fade truncate" dir="ltr">{me?.email || me?.name || "Admin"}</div>
            <button onClick={signOut} className="w-full text-start h-9 px-3 rounded-xl text-[13px] font-semibold text-st-rejected hover:bg-st-rejected-bg">
              {m.adminSignOut()}
            </button>
          </div>
        </aside>

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 bg-adm-bg/95 backdrop-blur border-b border-adm-line lg:ms-[232px]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div dir="ltr" className="h-14 px-4 lg:px-8 flex items-center gap-3">
            <div className="lg:hidden"><Logo /></div>
            <div className="flex-1" />
            {bell(bellRef)}
          </div>
        </header>

        {/* ── Page ── */}
        <main className="lg:ms-[232px] px-4 lg:px-8 pt-4 pb-28 lg:pb-12 max-w-[1180px]">
          {isAuthenticated ? children : authTimedOut ? (
            <div className="mx-auto max-w-md py-20 text-center space-y-4">
              <p className="text-sm font-semibold">{m.errSessionExpired()}</p>
              <button onClick={signOut} className="h-10 px-4 rounded-xl bg-adm-ink text-adm-surface text-sm font-semibold">{m.adminSignOut()}</button>
            </div>
          ) : (
            <div className="flex justify-center py-24">
              <div className="w-9 h-9 border-2 border-adm-line border-t-adm-accent rounded-full animate-spin" />
            </div>
          )}
        </main>

        {/* ── Phone: bottom bar ── */}
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-adm-surface border-t border-adm-line"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="grid grid-cols-5 h-[60px]">
            {nav.filter((n) => !n.extra).map((n) => (
              <Link key={n.href} to={n.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${is(n.href) ? "text-adm-accent" : "text-adm-soft"}`}>
                <Icon filled={is(n.href)}>{ICONS[n.key]}</Icon>
                <span>{n.label}</span>
                {n.badge ? (
                  <span className="absolute top-1.5 start-[calc(50%+6px)]"><Badge hot>{n.badge}</Badge></span>
                ) : null}
              </Link>
            ))}
            <button onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${moreActive ? "text-adm-accent" : "text-adm-soft"}`}>
              <Icon>{ICONS.more}</Icon>
              <span>More</span>
            </button>
          </div>
        </nav>

        <Panel open={moreOpen} onClose={() => setMoreOpen(false)} title="More" short>
          <div className="space-y-2">
            {nav.filter((n) => n.extra).map((n) => (
              <Link key={n.href} to={n.href}
                className={`flex items-center gap-3 h-14 px-4 rounded-2xl border bg-adm-surface ${is(n.href) ? "border-adm-accent text-adm-accent" : "border-adm-line text-adm-ink"}`}>
                <Icon>{ICONS[n.key]}</Icon>
                <span className="flex-1 text-[15px] font-semibold">{n.label}</span>
                {n.key === "offers" && activeOffer && <span className="text-[11.5px] font-bold text-st-approved">One is live</span>}
                <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />
              </Link>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-adm-fade mb-2 px-1">Language</p>
            <LanguagePicker />
          </div>
          <div className="text-[12px] text-adm-fade px-1" dir="ltr">{me?.email || me?.name || "Admin"}</div>
          <button onClick={signOut} className="w-full h-12 rounded-2xl border border-adm-line bg-adm-surface text-st-rejected text-[15px] font-semibold">
            {m.adminSignOut()}
          </button>
        </Panel>
      </div>
    </ToastProvider>
  );
}
