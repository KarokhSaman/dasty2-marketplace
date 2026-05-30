/**
 * Uppercase tracked section heading used above grids and carousels.
 * Children appear on the right of the title (filters, links, etc.).
 */
export default function SectionHeader({ title, children, className = "" }) {
  return (
    <div className={`relative z-20 flex items-center justify-between gap-2 mb-3 px-0.5 flex-wrap ${className}`}>
      <h2 className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-[0.18em]">
        {title}
      </h2>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
