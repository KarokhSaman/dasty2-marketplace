import { useState, useRef, useEffect } from "react";
import { useIsDesktop } from "@/components/ui/useMediaQuery";
import BottomSheet from "@/components/ui/BottomSheet";
import * as m from "@/paraglide/messages";

const STATUS_COLORS = {
  pending:  { bg: "bg-yellow-50", text: "text-yellow-600", hover: "hover:bg-yellow-100", border: "border-yellow-200" },
  approved: { bg: "bg-green-50", text: "text-green-600", hover: "hover:bg-green-100", border: "border-green-200" },
  rejected: { bg: "bg-red-50", text: "text-red-600", hover: "hover:bg-red-100", border: "border-red-200" },
  sold:     { bg: "bg-blue-50", text: "text-blue-600", hover: "hover:bg-blue-100", border: "border-blue-200" },
  paid:     { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:bg-purple-100", border: "border-purple-200" },
};

const STATUS_LABELS = {
  pending:  () => m.statusPending(),
  approved: () => m.statusApproved(),
  rejected: () => m.statusRejected(),
  sold:     () => m.statusSold(),
  paid:     () => m.statusPaid(),
};

const STATUS_ICONS = {
  pending:  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  approved: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  rejected: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l6-6m0 0l-6-6m6 6l6 6m-6-6l-6 6" /></svg>,
  sold:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8m10 0l2-8m-10 8h10m-10 0a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  paid:     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

export default function ProductStatusMenu({ product, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const isDesktop = useIsDesktop();
  const ref = useRef();

  useEffect(() => {
    if (!open || !isDesktop) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setConfirmStatus(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isDesktop]);

  const close = () => {
    setOpen(false);
    setConfirmStatus(null);
  };

  const currentColor = STATUS_COLORS[product.status];
  const allStatuses = ["pending", "approved", "rejected", "sold", "paid"];
  const availableStatuses = allStatuses.filter(s => s !== product.status);

  const rowCls = "flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-[15px] sm:text-sm text-start transition-colors";

  const actions = confirmStatus ? (
    <div className="p-4 sm:p-3">
      <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
        Change to {STATUS_LABELS[confirmStatus]()}?
      </p>
      <p className="text-xs text-[var(--color-ink-fade)] mb-3">
        This will update the product status. The seller will be notified.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onStatusChange(confirmStatus);
            close();
          }}
          className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          Change
        </button>
        <button
          onClick={() => setConfirmStatus(null)}
          className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors"
        >
          {m.adminCancel()}
        </button>
      </div>
    </div>
  ) : (
    <div className="py-1">
      {availableStatuses.map(status => {
        const color = STATUS_COLORS[status];
        return (
          <button
            key={status}
            onClick={() => setConfirmStatus(status)}
            className={`${rowCls} ${color.text} ${color.hover}`}
          >
            {STATUS_ICONS[status]}
            {STATUS_LABELS[status]()}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => {
          setOpen((v) => !v);
          setConfirmStatus(null);
        }}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${currentColor.bg} ${currentColor.text} border-current`}
        title="Click to change status"
      >
        {STATUS_LABELS[product.status]()}
      </button>

      {/* Desktop: anchored dropdown */}
      {open && isDesktop && (
        <div className="absolute end-0 top-full mt-1 bg-white border border-[var(--color-hairline)] rounded-xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-20 overflow-hidden min-w-[180px]">
          {actions}
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {!isDesktop && (
        <BottomSheet open={open} onClose={close} title="Change Product Status">
          {actions}
        </BottomSheet>
      )}
    </div>
  );
}
