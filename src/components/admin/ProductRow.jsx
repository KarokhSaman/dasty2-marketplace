import * as m from "@/paraglide/messages";
import { StatusChip, StoreTag, Code, Thumb, fmtIQD, IconStar } from "@/components/admin/ui";

const shortDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

// One product in a list: tap to open its panel. On phones it is a compact
// two-line card; on laptops the seller gets its own column. `compact` keeps the
// phone layout everywhere, for narrow places like a side panel.
export default function ProductRow({ product: p, onOpen, selected, onToggle, compact = false }) {
  const wide = (cls) => (compact ? "" : cls);
  const soldish = p.status === "sold" || p.status === "paid";
  const shown = soldish ? (p.salePrice ?? p.price) : p.price;
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(p)} onKeyDown={(e) => e.key === "Enter" && onOpen(p)}
      className={`flex items-center gap-3 px-3 lg:px-4 py-3 min-h-[76px] cursor-pointer transition-colors ${selected ? "bg-adm-accent-soft" : "hover:bg-adm-sunk"}`}>
      {onToggle && (
        <input type="checkbox" checked={!!selected} aria-label={`Select ${p.seq ?? p.title}`}
          onClick={(e) => e.stopPropagation()} onChange={() => onToggle(p)}
          className="w-[22px] h-[22px] lg:w-[18px] lg:h-[18px] shrink-0 accent-[var(--a-accent)] cursor-pointer" />
      )}
      <Thumb src={p.photos?.[p.mainPhotoIndex ?? 0]} size={52} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-snug truncate">{p.title}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-adm-fade min-w-0">
          {p.seq && <Code>{p.seq}</Code>}
          {p.storeId && <StoreTag />}
          {p.featured && <span className="text-st-pending"><IconStar filled className="w-3.5 h-3.5" /></span>}
          <span className={`truncate ${wide("lg:hidden")}`}>{p.sellerName}</span>
          {!compact && <span className="truncate max-lg:hidden">{p.category} · {shortDay(soldish ? p.dateSold : p.dateAdded)}</span>}
        </div>
      </div>
      {!compact && (
        <div className="max-lg:hidden w-[170px] min-w-0 text-[12.5px]">
          <p className="font-semibold truncate">{p.sellerName}</p>
          <p className="text-adm-fade truncate">{p.city}</p>
        </div>
      )}
      <div className={`flex flex-col items-end gap-1 shrink-0 ${wide("lg:flex-row lg:items-center lg:gap-4")}`}>
        <div className={`text-end ${wide("lg:w-[112px]")}`}>
          <p className="text-[14px] font-bold tabular-nums" dir="ltr">
            {p.salePrice != null && p.salePrice !== p.price && <s className="text-[11px] font-medium text-adm-fade me-1">{fmtIQD(p.price)}</s>}
            {fmtIQD(shown)}
          </p>
          {!compact && <p className="text-[11px] font-semibold text-adm-accent tabular-nums max-lg:hidden">{m.adminProfitLabel()} {fmtIQD(p.profit)}</p>}
        </div>
        <div className={`flex ${wide("lg:w-[118px] lg:justify-end")}`}><StatusChip status={p.status} /></div>
      </div>
    </div>
  );
}

export function RowList({ children, className = "" }) {
  return <div className={`bg-adm-surface border border-adm-line rounded-2xl overflow-hidden divide-y divide-adm-line ${className}`}>{children}</div>;
}
