import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as m from "@/paraglide/messages";
import { photoProps } from "@/lib/images";
import { lockScroll } from "@/lib/scrollLock";

// Shared pieces for the admin pages. Colours come from the admin theme
// (adm-* / st-* in globals.css), which follows the device's light/dark mode.

export const fmtIQD = (n) => `${Number(n ?? 0).toLocaleString("en-US")}`;

// ── Buttons ───────────────────────────────────────────────
const BTN = {
  base: "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  md: "h-10 px-4 text-[13.5px] rounded-xl",
  sm: "h-8 px-3 text-[12.5px] rounded-[10px]",
  lg: "h-12 px-5 text-[15px] rounded-[14px]",
  primary: "bg-adm-accent text-white hover:opacity-90",
  dark: "bg-adm-ink text-adm-surface hover:opacity-90",
  outline: "border border-adm-line bg-adm-surface text-adm-ink hover:border-adm-fade",
  ghost: "text-adm-soft hover:bg-adm-sunk hover:text-adm-ink",
  danger: "border border-st-rejected/40 bg-adm-surface text-st-rejected hover:bg-st-rejected-bg",
  wa: "bg-adm-wa text-white hover:opacity-90",
  approve: "bg-st-approved text-white hover:opacity-90",
};
export function btn(variant = "outline", size = "md") {
  return `${BTN.base} ${BTN[size]} ${BTN[variant]}`;
}

// ── Status ────────────────────────────────────────────────
export const STATUS = {
  pending: { label: () => m.statusPending(), cls: "text-st-pending bg-st-pending-bg" },
  approved: { label: () => m.statusApproved(), cls: "text-st-approved bg-st-approved-bg" },
  rejected: { label: () => m.statusRejected(), cls: "text-st-rejected bg-st-rejected-bg" },
  sold: { label: () => m.statusSold(), cls: "text-st-sold bg-st-sold-bg" },
  paid: { label: () => m.statusPaid(), cls: "text-st-paid bg-st-paid-bg" },
  deletion_requested: { label: () => m.adminDeleteRequests(), cls: "text-st-delete bg-st-delete-bg" },
};

export function StatusChip({ status, className = "" }) {
  const s = STATUS[status] ?? { label: () => status, cls: "text-adm-soft bg-adm-sunk" };
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-bold whitespace-nowrap ${s.cls} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      {s.label()}
    </span>
  );
}

// ── Small parts ───────────────────────────────────────────
export function Thumb({ src, size = 48, className = "" }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-[10px] bg-adm-sunk ${className}`} style={{ width: size, height: size }}>
      {src ? <img {...photoProps(src, size * 2)} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
    </div>
  );
}

export function Avatar({ name, size = 40, className = "" }) {
  const initials = (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className={`shrink-0 rounded-full bg-adm-sunk text-adm-soft font-bold grid place-items-center ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
}

export function StoreTag() {
  return <span className="inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10px] font-bold bg-adm-navy text-white">{m.storeFlag()}</span>;
}

export function Code({ children }) {
  return <span dir="ltr" className="font-mono text-[11px] text-adm-soft bg-adm-sunk px-1.5 py-px rounded-[5px] whitespace-nowrap shrink-0">{children}</span>;
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] text-adm-fade">{children}</h4>
      {action && <div className="ms-auto">{action}</div>}
    </div>
  );
}

export function Card({ className = "", children, ...rest }) {
  return <div className={`bg-adm-surface border border-adm-line rounded-2xl ${className}`} {...rest}>{children}</div>;
}

export function Empty({ children }) {
  return <div className="py-10 px-4 text-center text-[13px] text-adm-fade">{children}</div>;
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-[72px] rounded-2xl bg-adm-sunk" />)}
    </div>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-[20px] font-bold tracking-[-0.01em] text-adm-ink truncate">{title}</h1>
        {sub && <p className="text-[12.5px] text-adm-fade mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Segmented({ options, value, onChange, className = "", size = "md" }) {
  return (
    <div className={`grid gap-1 p-1 rounded-xl bg-adm-sunk ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`rounded-[9px] ${size === "sm" ? "py-1.5 text-[11.5px]" : "py-2 text-[12.5px]"} font-semibold transition-colors ${
            value === o.value ? "bg-adm-surface text-adm-ink shadow-[0_1px_3px_rgba(11,12,15,0.12)]" : "text-adm-soft hover:text-adm-ink"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-[26px] rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? "bg-st-approved" : "bg-adm-line"}`}>
      <span className={`absolute top-[3px] start-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px] rtl:-translate-x-[18px]" : ""}`} />
    </button>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-adm-line bg-adm-surface focus-within:border-adm-fade min-w-0">
      <svg className="w-4 h-4 text-adm-fade shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-adm-ink placeholder:text-adm-fade" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="text-adm-fade hover:text-adm-ink">
          <IconX className="w-4 h-4" />
        </button>
      )}
    </label>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 pb-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
            value === o.value ? "bg-adm-ink text-adm-surface border-adm-ink" : "bg-adm-surface text-adm-soft border-adm-line hover:border-adm-fade"
          }`}>
          {o.label}
          {o.count != null && <span className="text-[11px] opacity-70 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const inputCls =
  "w-full h-11 px-3 rounded-xl border border-adm-line bg-adm-surface text-[14px] text-adm-ink outline-none focus:border-adm-fade placeholder:text-adm-fade";
export const labelCls = "block text-[11.5px] font-semibold text-adm-fade mb-1";

// Digits typed in Kurdish/Arabic become 0-9; commas are added as you type.
export function parseAmount(text) {
  const western = String(text ?? "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  const n = Number(western.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
export function AmountInput({ value, onChange, id, placeholder, className = "" }) {
  return (
    <input id={id} type="text" inputMode="numeric" dir="ltr" placeholder={placeholder}
      value={value ? fmtIQD(value) : ""}
      onChange={(e) => onChange(parseAmount(e.target.value))}
      className={`${inputCls} tabular-nums ${className}`} />
  );
}

// ── Icons ─────────────────────────────────────────────────
const I = ({ children, className = "w-[18px] h-[18px]", sw = 2 }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IconX = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const IconCheck = (p) => <I {...p} sw={2.5}><path d="M5 12l5 5L20 7" /></I>;
export const IconRotate = (p) => <I {...p} sw={2.3}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></I>;
export const IconStar = ({ filled, ...p }) => (
  <svg className={p.className ?? "w-[18px] h-[18px]"} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" />
  </svg>
);
export const IconTrash = (p) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></I>;
export const IconCopy = (p) => <I {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></I>;
export const IconPlus = (p) => <I {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></I>;
export const IconChevron = (p) => <I {...p}><path d="m9 6 6 6-6 6" /></I>;
export const IconExternal = (p) => <I {...p}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></I>;
export const IconWhatsApp = ({ className = "w-[18px] h-[18px]" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

// An invisible left-to-right mark keeps "+964…" in order when the copied
// number is pasted into Kurdish or Arabic text (otherwise the + jumps to the end).
export const ltrPhone = (phone) => `\u200E${phone ?? ""}`;

// WhatsApp wants the number in international form: Kurdish/Arabic digits
// become 0-9, a local 07… number becomes 9647…, and a leading 00 is dropped.
export function waNumber(phone) {
  let d = String(phone ?? "")
    .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
    .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
    .replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `964${d.slice(1)}`;
  return d;
}

// api.whatsapp.com keeps the message's line breaks on every phone; the short
// wa.me link can flatten them into one paragraph.
export function waLink(phone, text) {
  const params = new URLSearchParams({ phone: waNumber(phone) });
  if (text) params.set("text", text);
  return `https://api.whatsapp.com/send?${params.toString().replace(/\+/g, "%20")}`;
}

// ── Toasts ────────────────────────────────────────────────
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, tone = "ok") => {
    clearTimeout(timer.current);
    setToast({ message, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), tone === "error" ? 4500 : 2200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.key} role="status"
          className={`adm-toast fixed left-1/2 z-[90] max-w-[calc(100vw-32px)] px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-[var(--a-shadow)] ${
            toast.tone === "error" ? "bg-st-rejected text-white" : "bg-adm-ink text-adm-surface"
          }`}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)", transform: "translateX(-50%)" }}>
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// Copy to the clipboard and say so; falls back quietly where it is blocked.
export function useCopy() {
  const toast = useToast();
  return async (text, done = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast("Copy is blocked here. Long-press to copy instead.", "error");
    }
  };
}

// ── Panel: bottom sheet on phones, side panel on laptops ─
export function Panel({ open, onClose, title, subtitle, leading, children, footer, wide = false, short = false }) {
  const [mounted, setMounted] = useState(false);
  const startY = useRef(null);
  const [drag, setDrag] = useState(0);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    setDrag(0);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  // Hold the page still while open; closing returns to the same scroll spot.
  useEffect(() => (open ? lockScroll() : undefined), [open]);

  if (!mounted || !open) return null;

  const onDown = (e) => { startY.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (startY.current != null) setDrag(Math.max(0, e.clientY - startY.current)); };
  const onUp = () => { if (startY.current == null) return; if (drag > 110) onClose?.(); else setDrag(0); startY.current = null; };

  return createPortal(
    <div className="adm-scope fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Panel"}>
      <div className="absolute inset-0 bg-black/40 backdrop-fade" onClick={onClose} aria-hidden />
      <div
        className={`adm-panel absolute inset-x-0 bottom-0 ${short ? "max-h-[92dvh]" : "h-[92dvh]"} rounded-t-[22px] bg-adm-bg flex flex-col shadow-[var(--a-shadow)]
          lg:inset-x-auto lg:end-0 lg:top-0 lg:h-full lg:max-h-none lg:rounded-none lg:border-s lg:border-adm-line ${wide ? "lg:w-[560px]" : "lg:w-[480px]"}`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div className="lg:hidden pt-2 pb-1 flex justify-center touch-none cursor-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="h-[5px] w-10 rounded-full bg-adm-line" />
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 pt-1 lg:pt-4 border-b border-adm-line">
          {leading}
          <div className="flex-1 min-w-0">
            <div className="text-[15.5px] font-bold text-adm-ink truncate">{title}</div>
            {subtitle && <div className="mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl border border-adm-line bg-adm-surface grid place-items-center text-adm-soft hover:text-adm-ink shrink-0">
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 space-y-5">{children}</div>
        {footer && (
          <div className="flex items-center gap-2 px-4 pt-3 border-t border-adm-line bg-adm-bg" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Inline "are you sure?" box used inside panels instead of browser dialogs.
export function ConfirmBox({ title, text, confirmLabel, tone = "danger", onConfirm, onCancel, busy }) {
  return (
    <div className={`rounded-2xl p-3.5 ${tone === "danger" ? "bg-st-rejected-bg" : "bg-adm-sunk"}`}>
      <p className="text-[13.5px] font-bold text-adm-ink">{title}</p>
      {text && <p className="text-[12.5px] text-adm-soft mt-1 leading-relaxed">{text}</p>}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={onConfirm} disabled={busy} className={`${btn(tone === "danger" ? "primary" : "dark")} flex-1`}>{confirmLabel}</button>
        <button type="button" onClick={onCancel} className={`${btn("outline")} flex-1`}>{m.adminCancel()}</button>
      </div>
    </div>
  );
}
