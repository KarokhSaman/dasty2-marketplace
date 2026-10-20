import { useState, useRef, useEffect } from "react";
import { useIsDesktop } from "@/components/ui/useMediaQuery";
import BottomSheet from "@/components/ui/BottomSheet";
import * as m from "@/paraglide/messages";
import { priceInfo } from "@/convex/discount";
import { normalizeDigits } from "@/lib/utils";
import FlipPanel from "@/components/ui/FlipPanel";
import { StatusIcons, iconButtonCls } from "@/components/admin/ActionIcons";

const STATUS_COLORS = {
  pending:  { bg: "bg-yellow-50", text: "text-yellow-600", hover: "hover:bg-yellow-100", border: "border-yellow-200", ring: "ring-yellow-200" },
  approved: { bg: "bg-green-50", text: "text-green-600", hover: "hover:bg-green-100", border: "border-green-200", ring: "ring-green-200" },
  rejected: { bg: "bg-red-50", text: "text-red-600", hover: "hover:bg-red-100", border: "border-red-200", ring: "ring-red-200" },
  sold:     { bg: "bg-blue-50", text: "text-blue-600", hover: "hover:bg-blue-100", border: "border-blue-200", ring: "ring-blue-200" },
  paid:     { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:bg-purple-100", border: "border-purple-200", ring: "ring-purple-200" },
  deletion_requested: { bg: "bg-orange-50", text: "text-orange-600", hover: "hover:bg-orange-100", border: "border-orange-200", ring: "ring-orange-200" },
};

const STATUS_LABELS = {
  pending:  () => m.statusPending(),
  approved: () => m.statusApproved(),
  rejected: () => m.statusRejected(),
  sold:     () => m.statusSold(),
  paid:     () => m.statusPaid(),
  deletion_requested: () => m.statusDeletionRequested(),
};

const STATUS_ICONS = StatusIcons;

export default function ProductStatusMenu({ product, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [salePriceInput, setSalePriceInput] = useState("");
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

  // While a store discount runs, the sale price (what the buyer actually paid)
  // is confirmed here, prefilled with the discounted price.
  const discount = priceInfo(product);
  const askSalePrice = (confirmStatus === "sold" || confirmStatus === "paid") && discount.original !== null;
  useEffect(() => {
    if (confirmStatus === "sold" || confirmStatus === "paid") setSalePriceInput(String(discount.price));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmStatus]);

  const currentColor = STATUS_COLORS[product.status];
  const allStatuses = ["pending", "approved", "rejected", "sold", "paid"];
  // Stocked products (more than one unit left): sold or paid records one unit
  // as its own entry, takes it off the stock and keeps the listing live.
  const hasStock = product.status === "approved" && product.stock > 1;
  const availableStatuses = allStatuses.filter(s => s !== product.status);

  const rowCls = "flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-[15px] sm:text-sm text-start transition-colors";

  const actions = confirmStatus ? (
    <div className="p-4 sm:p-3">
      <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
        Change to {STATUS_LABELS[confirmStatus]()}?
      </p>
      <p className="text-xs text-[var(--color-ink-fade)] mb-3">
        {product.soldFromId && confirmStatus === "approved"
          ? "The buyer cancelled. This unit goes back to the product's stock (+1) and this entry is removed."
          : hasStock && (confirmStatus === "sold" || confirmStatus === "paid")
          ? `Records one unit as ${confirmStatus}. Stock goes from ${product.stock} to ${product.stock - 1} and the product stays live.`
          : "This will update the product status. The seller will be notified."}
      </p>
      {askSalePrice && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1">
            Sale price (IQD) — discount running: {discount.percent}% off {discount.original.toLocaleString("en-US")}
          </p>
          <input
            type="text" inputMode="numeric" dir="ltr" value={salePriceInput}
            onChange={(e) => setSalePriceInput(e.target.value)}
            className="w-full border border-[var(--color-hairline)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300)]"
          />
          <p className="text-[11px] text-[var(--color-ink-fade)] mt-1">
            The sale and the service fee are recorded on this price. Change it if the buyer paid something else.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (askSalePrice) {
              const price = Number(normalizeDigits(salePriceInput).replace(/[^\d]/g, ""));
              if (!price) return;
              onStatusChange(confirmStatus, { salePrice: price });
            } else {
              onStatusChange(confirmStatus);
            }
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
        className={`${iconButtonCls} ${currentColor.bg} ${currentColor.text} ${currentColor.ring} ${currentColor.hover}`}
        title={`Status: ${STATUS_LABELS[product.status]()}`}
        aria-label={`Status: ${STATUS_LABELS[product.status]()}`}
      >
        {STATUS_ICONS[product.status]}
      </button>

      {/* Desktop: anchored dropdown */}
      {open && isDesktop && (
        <FlipPanel gap="1" height={240} className="end-0 bg-white border border-[var(--color-hairline)] rounded-xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-20 overflow-hidden min-w-[180px]">
          {actions}
        </FlipPanel>
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
