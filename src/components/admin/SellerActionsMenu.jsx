import { useState, useRef, useEffect } from "react";
import { useIsDesktop } from "@/components/ui/useMediaQuery";
import BottomSheet from "@/components/ui/BottomSheet";
import * as m from "@/paraglide/messages";

export default function SellerActionsMenu({ seller, onPromote, onToggleActive, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const isDesktop = useIsDesktop();
  const ref = useRef();

  useEffect(() => {
    if (!open || !isDesktop) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setConfirmDel(false);
        setConfirmPromote(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isDesktop]);

  const close = () => {
    setOpen(false);
    setConfirmDel(false);
    setConfirmPromote(false);
  };

  const rowCls = "flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-[15px] sm:text-sm text-start transition-colors";

  const actions = confirmPromote ? (
    <div className="p-4 sm:p-3">
      <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">Promote to Admin?</p>
      <p className="text-xs text-[var(--color-ink-fade)] mb-3">
        This seller will no longer have seller access. They can only access the admin dashboard.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onPromote();
            close();
          }}
          className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          Promote
        </button>
        <button
          onClick={() => setConfirmPromote(false)}
          className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors"
        >
          {m.adminCancel()}
        </button>
      </div>
    </div>
  ) : confirmDel ? (
    <div className="p-4 sm:p-3">
      <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">Delete seller "{seller.name}"?</p>
      <p className="text-xs text-[var(--color-ink-fade)] mb-3">
        This action cannot be undone. The seller will be permanently deleted.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onDelete();
            close();
          }}
          className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {m.adminDelete()}
        </button>
        <button
          onClick={() => setConfirmDel(false)}
          className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors"
        >
          {m.adminCancel()}
        </button>
      </div>
    </div>
  ) : (
    <div className="py-1">
      <button
        onClick={() => setConfirmPromote(true)}
        className={`${rowCls} text-indigo-600 hover:bg-indigo-50`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Promote to Admin
      </button>

      <button
        onClick={() => {
          onToggleActive();
          close();
        }}
        className={`${rowCls} text-[var(--color-ink)] hover:bg-[var(--color-cream)]`}
      >
        <svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {seller.isActive ? m.adminDeactivate() : m.adminActivate()}
      </button>

      <div className="border-t border-[var(--color-hairline)] mx-2 my-1" />

      <button
        onClick={() => setConfirmDel(true)}
        className={`${rowCls} text-red-500 hover:bg-red-50`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        {m.adminDelete()}
      </button>
    </div>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => {
          setOpen((v) => !v);
          setConfirmDel(false);
        }}
        aria-label="Actions"
        className="p-1.5 text-[var(--color-ink-fade)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)] rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {/* Desktop: anchored dropdown */}
      {open && isDesktop && (
        <div className="absolute end-0 top-full mt-1 bg-white border border-[var(--color-hairline)] rounded-xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-20 overflow-hidden min-w-[160px]">
          {actions}
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {!isDesktop && (
        <BottomSheet open={open} onClose={close} title={`Actions for ${seller.name}`}>
          {actions}
        </BottomSheet>
      )}
    </div>
  );
}
