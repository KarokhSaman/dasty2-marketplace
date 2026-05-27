import { forwardRef } from "react";

/**
 * Round icon-only button used for back arrows, close buttons, and toolbar actions.
 *   <IconButton onClick={...} aria-label="Close"><CloseIcon /></IconButton>
 */
const IconButton = forwardRef(function IconButton(
  { children, size = "md", variant = "outline", className = "", ...rest },
  ref,
) {
  const sizeCls = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-11 h-11" : "w-10 h-10";
  const variantCls =
    variant === "outline"
      ? "bg-white border border-[var(--color-hairline)] hover:border-[var(--color-ember-300)] hover:bg-[var(--color-ember-50)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)]"
      : variant === "ghost"
      ? "text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] hover:bg-white/70"
      : "bg-[var(--color-cream-deep)] hover:bg-[var(--color-ember-100)] text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)]";
  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center rounded-full transition-colors ${sizeCls} ${variantCls} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
