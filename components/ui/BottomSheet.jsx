import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDesktop } from "./useMediaQuery";

/**
 * Responsive overlay primitive.
 *   • Mobile  → bottom sheet: slides up, drag-handle, drag-to-dismiss, safe-area padding.
 *   • Desktop → centered dialog (≥640px).
 *
 * SSR-safe: portals to document.body only after mount; never touches `document`
 * during render. Closes on Esc, backdrop tap, or downward drag past threshold.
 *
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="Sort by">
 *     …rows…
 *   </BottomSheet>
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  className = "",
  contentClassName = "",
}) {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useIsDesktop();
  const panelRef = useRef(null);
  const startY = useRef(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => setMounted(true), []);

  // Esc to close + body scroll-lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Focus the panel on open; reset any leftover drag offset.
  useEffect(() => {
    if (open) {
      setDrag(0);
      panelRef.current?.focus();
    }
  }, [open]);

  if (!mounted || !open) return null;

  // ── Drag-to-dismiss (mobile, via the grab handle) ──
  const onHandleDown = (e) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e) => {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    setDrag(dy > 0 ? dy : 0);
  };
  const onHandleUp = () => {
    if (startY.current == null) return;
    if (drag > 110) onClose?.();
    else setDrag(0);
    startY.current = null;
  };

  const anim = isDesktop ? "dialog-in" : "sheet-up";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <div
        className="absolute inset-0 bg-[rgba(11,12,15,0.45)] backdrop-fade"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full sm:w-auto sm:min-w-[360px] sm:max-w-md bg-[var(--color-paper)] outline-none flex flex-col max-h-[86vh] sm:max-h-[80vh] rounded-t-[1.5rem] sm:rounded-[1.25rem] sm:m-4 shadow-[0_-12px_44px_-12px_rgba(11,12,15,0.32)] sm:shadow-[0_28px_64px_-24px_rgba(11,12,15,0.45)] ${anim} ${className}`}
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: startY.current == null ? "transform 220ms cubic-bezier(0.22,1,0.36,1)" : "none",
        }}
      >
        {/* Grab handle — mobile only */}
        <div
          className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-[var(--color-hairline)]" />
        </div>

        {title && (
          <header className="shrink-0 flex items-center justify-between gap-3 px-5 pt-1.5 sm:pt-4 pb-3 border-b border-[var(--color-hairline)]">
            <h2 className="font-display text-[17px] text-[var(--color-ink)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-me-1 inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-cream-deep)] tap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>
        )}

        <div
          className={`overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
