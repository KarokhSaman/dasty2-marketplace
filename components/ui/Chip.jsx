/**
 * Small pill-shaped label used for badges, statuses, and meta info.
 *
 * Tones map to the design system palette:
 *   neutral  — quiet surface chip (default)
 *   brand    — soft ember tint
 *   dark     — ink-on-cream (used on photo overlays)
 *   success  — jade tint (e.g. "New")
 *   warning  — honey tint (e.g. "Used")
 *   outline  — white with hairline border
 */
const TONES = {
  neutral: "bg-[var(--color-cream-deep)] text-[var(--color-ink)]",
  brand:   "bg-[var(--color-ember-50)] text-[var(--color-ember-700)]",
  dark:    "bg-[var(--color-ink)]/85 text-[var(--color-cream)] backdrop-blur-md",
  success: "bg-[var(--color-jade-50)] text-[var(--color-jade-600)]",
  warning: "bg-[var(--color-honey-50)] text-[var(--color-honey-600)]",
  outline: "bg-white border border-[var(--color-hairline)] text-[var(--color-ink-soft)]",
  glass:   "bg-white/90 text-[var(--color-ink)] backdrop-blur-md",
};

export default function Chip({
  children,
  tone = "neutral",
  leadingIcon,
  trailingIcon,
  dot = false,
  className = "",
  ...rest
}) {
  const tint = TONES[tone] ?? TONES.neutral;
  return (
    <span className={`chip-base ${tint} ${className}`} {...rest}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tone === "success" ? "bg-[var(--color-jade-500)]"
            : tone === "warning" ? "bg-[var(--color-honey-600)]"
            : tone === "brand"   ? "bg-[var(--color-ember-500)]"
            : "bg-current"
          }`}
        />
      )}
      {leadingIcon}
      {children}
      {trailingIcon}
    </span>
  );
}
