import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { Link } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { photoProps } from "@/lib/images";
import { lockScroll } from "@/lib/scrollLock";

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return m.notifJustNow();
  if (mins < 60) return m.notifMinutesAgo({ count: mins });
  const h = Math.floor(mins / 60);
  if (h < 24) return m.notifHoursAgo({ count: h });
  return m.notifDaysAgo({ count: Math.floor(h / 24) });
}

// Notifications are saved as finished sentences (in the language the admin
// used), so the kind is read from the wording in any of the three languages.
const KINDS = [
  ["offer", /^🎉/],
  ["price", /^The price of/],
  ["review", /^(New product submitted|Product resubmitted)/],
  ["delete", /^Deletion requested|request to delete|داواکاری سڕینەوە|طلب حذف/],
  ["rejected", /rejected|ڕەتکرایەوە|رفض/],
  ["removed", /sold elsewhere|شوێنێکی تر|مكان آخر/],
  ["paid", /payment|پارەی|دفع/],
  ["sold", /sold|فرۆشرا|بيع/],
  ["approved", /approved|پەسەندکرا|الموافقة/],
];
const kindOf = (message) => KINDS.find(([, re]) => re.test(message ?? ""))?.[0] ?? "info";

const path = (d) => <path strokeLinecap="round" strokeLinejoin="round" d={d} />;
const KIND_STYLE = {
  approved: ["bg-emerald-50 text-emerald-600", path("M5 12.5l4.5 4.5L19 7.5")],
  rejected: ["bg-rose-50 text-rose-600", path("M7 7l10 10M17 7L7 17")],
  sold: ["bg-blue-50 text-blue-600", path("M3 7h2l2.2 9.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 10H6.2M9.5 20.5h.01M16.5 20.5h.01")],
  paid: ["bg-violet-50 text-violet-600", path("M3 7.5h18v10H3zM3 11h18M7 15h3")],
  review: ["bg-amber-50 text-amber-600", path("M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z")],
  delete: ["bg-zinc-100 text-zinc-600", path("M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13")],
  removed: ["bg-zinc-100 text-zinc-600", path("M4 12h16")],
  price: ["bg-blue-50 text-blue-600", path("M4 12.5 11.5 5H19v7.5L11.5 20Zm11-4h.01")],
  offer: ["bg-rose-50 text-rose-600", path("M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8Z")],
  info: ["bg-zinc-100 text-zinc-500", path("M12 8h.01M11 12h1v5h1")],
};

function KindIcon({ kind, className = "" }) {
  const [cls, d] = KIND_STYLE[kind];
  return (
    <span className={`grid place-items-center rounded-full ${cls} ${className}`}>
      <svg className="w-[60%] h-[60%]" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">{d}</svg>
    </span>
  );
}

function Row({ n, product, isNew, onClose }) {
  const kind = kindOf(n.message);
  const photo = product?.photos?.[product.mainPhotoIndex ?? 0] ?? product?.photos?.[0];
  const body = (
    <>
      <span className="relative shrink-0 w-11 h-11">
        {photo ? (
          <>
            <img {...photoProps(photo, 100)} alt="" className="w-11 h-11 rounded-xl object-cover bg-[var(--color-cream-deep)]" />
            <KindIcon kind={kind} className="absolute -bottom-1 -end-1 w-5 h-5 ring-2 ring-white" />
          </>
        ) : (
          <KindIcon kind={kind} className="w-11 h-11" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span dir="auto" className="block text-start text-[13.5px] leading-snug text-[var(--color-ink)] line-clamp-3">{n.message}</span>
        <span className="flex items-center gap-1.5 mt-1 text-[11.5px] text-[var(--color-ink-fade)]">
          {product?.seq && <span dir="ltr" className="font-mono rounded-md bg-[var(--color-cream-deep)] px-1.5 py-px text-[var(--color-ink-soft)]">#{product.seq}</span>}
          <span>{timeAgo(n.createdAt)}</span>
        </span>
      </span>
      {isNew && <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--color-ember-500)] shrink-0" aria-hidden />}
    </>
  );
  const cls = `w-full text-start px-4 py-3 flex gap-3 items-start transition-colors ${
    isNew ? "bg-[var(--color-ember-50)] hover:bg-[var(--color-ember-100)]/60" : "hover:bg-[var(--color-cream)]"}`;
  return n.url
    ? <Link to={n.url} onClick={onClose} className={cls}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

// The bell's list: a bottom sheet on phones, a dropdown under the bell on
// laptops. What was unread when it opened stays marked "New" until it closes.
// `products` (optional) adds each product's photo and code.
export default function NotificationPanel({ notifications, sellerId, label, onClose, bellRef, products }) {
  const markAllRead = useMutation(api.notifications.markAllRead);
  const panelRef = useRef();
  const [phone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  const [fresh] = useState(() => new Set((notifications ?? []).filter((n) => !n.read).map((n) => n._id)));

  useEffect(() => {
    if (notifications?.some((n) => !n.read)) markAllRead({ sellerId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phone) return undefined;
    function handler(e) {
      // Ignore clicks on the bell — the bell's onClick handles toggling
      if (bellRef?.current?.contains(e.target)) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, bellRef, phone]);

  useEffect(() => (phone ? lockScroll() : undefined), [phone]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p._id, p])), [products]);
  const sorted = [...(notifications ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
  const newOnes = sorted.filter((n) => fresh.has(n._id));
  const earlier = sorted.filter((n) => !fresh.has(n._id));

  const group = (title, list, isNew) => list.length > 0 && (
    <div>
      <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] rtl:tracking-normal text-[var(--color-ink-fade)]">{title}</p>
      <div className="divide-y divide-[var(--color-hairline)]">
        {list.map((n) => <Row key={n._id} n={n} product={byId.get(n.productId)} isNew={isNew} onClose={onClose} />)}
      </div>
    </div>
  );

  const header = (
    <div className="px-4 py-3 border-b border-[var(--color-hairline)] flex items-center gap-2 shrink-0">
      <p className="flex-1 text-[15px] font-bold text-[var(--color-ink)]">{label}</p>
      <button type="button" onClick={onClose} aria-label="Close"
        className="w-8 h-8 grid place-items-center rounded-full border border-[var(--color-hairline)] text-[var(--color-ink-soft)] hover:bg-[var(--color-cream)]">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  const list = (
    <div className="overflow-y-auto overscroll-contain flex-1 pb-2">
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--color-ink-fade)]">
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-[13px]">{m.notifEmpty()}</p>
        </div>
      ) : (
        <>
          {group(m.notifNew(), newOnes, true)}
          {group(m.notifEarlier(), earlier, false)}
        </>
      )}
    </div>
  );

  if (phone) {
    return createPortal(
      <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={label}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div ref={panelRef} className="absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-[22px] bg-white shadow-[0_-12px_40px_-12px_rgba(11,12,15,0.35)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="pt-2 flex justify-center"><span className="h-[5px] w-10 rounded-full bg-[var(--color-hairline)]" /></div>
          {header}
          {list}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div ref={panelRef}
      className="absolute top-full end-0 mt-2 z-50 w-[360px] max-h-[480px] bg-white rounded-2xl border border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(11,12,15,0.3)] overflow-hidden flex flex-col">
      {header}
      {list}
    </div>
  );
}
