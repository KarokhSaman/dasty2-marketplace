import WhatsAppIcon from "./WhatsAppIcon";

/**
 * WhatsApp CTA — green gradient. Renders as an anchor and opens in a new tab.
 *
 *   size="lg"  →  full-width primary CTA (product page desktop)
 *   size="md"  →  compact pill (sticky bottom bar on mobile)
 */
const SIZES = {
  md: "px-5 py-3 text-[13px] gap-1.5 rounded-2xl shadow-[0_10px_22px_-8px_rgba(17,120,85,0.55)]",
  lg: "py-4 text-[15px] gap-2 rounded-2xl shadow-[0_14px_30px_-12px_rgba(17,120,85,0.5)] w-full",
};

export default function WhatsAppButton({
  href,
  size = "lg",
  label = "WhatsApp",
  iconClassName,
  className = "",
}) {
  const s = SIZES[size] ?? SIZES.lg;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center font-bold bg-gradient-to-br from-[#1cc35a] to-[var(--color-jade-600)] hover:from-[var(--color-jade-500)] hover:to-[var(--color-jade-600)] text-white transition-all active:scale-[0.98] hover:scale-[1.01] ${s} ${className}`}
    >
      <WhatsAppIcon className={iconClassName ?? (size === "lg" ? "w-5 h-5 shrink-0" : "w-4 h-4 shrink-0")} />
      {label}
    </a>
  );
}
