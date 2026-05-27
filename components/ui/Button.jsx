import { forwardRef } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Polymorphic button primitive — renders as <button>, <a>, or <Link>
 * depending on which prop is set (`to` → router Link, `href` → anchor, else button).
 *
 *   variants:  primary | ink | outline | ghost | success
 *   sizes:     sm | md | lg
 *   shape:     pill (default) | square
 */
const VARIANTS = {
  primary:
    "bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] active:bg-[var(--color-ember-700)] text-white shadow-[0_10px_22px_-12px_rgba(237,0,64,0.45)]",
  ink:
    "bg-[var(--color-ink)] hover:bg-[var(--color-ember-600)] text-[var(--color-cream)]",
  outline:
    "bg-white border border-[var(--color-hairline)] hover:border-[var(--color-ember-300)] text-[var(--color-ink)]",
  ghost:
    "bg-transparent hover:bg-white/60 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
  success:
    "bg-gradient-to-br from-[#1cc35a] to-[var(--color-jade-600)] hover:from-[var(--color-jade-500)] hover:to-[var(--color-jade-600)] text-white shadow-[0_14px_30px_-12px_rgba(17,120,85,0.5)]",
};

const SIZES = {
  sm: "text-xs font-semibold px-3 py-1.5 gap-1",
  md: "text-[13px] font-semibold px-4 py-2.5 gap-1.5",
  lg: "text-[15px] font-bold px-5 py-3.5 gap-2",
};

const SHAPES = {
  pill: "rounded-full",
  square: "rounded-2xl",
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    shape = "pill",
    leadingIcon,
    trailingIcon,
    block = false,
    className = "",
    to,
    href,
    type,
    ...rest
  },
  ref,
) {
  const cls = [
    "inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    SHAPES[shape] ?? SHAPES.pill,
    block ? "w-full" : "",
    className,
  ].join(" ");

  const content = (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  );

  if (to) {
    return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  }
  if (href) {
    return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  }
  return (
    <button ref={ref} type={type ?? "button"} className={cls} {...rest}>
      {content}
    </button>
  );
});

export default Button;
