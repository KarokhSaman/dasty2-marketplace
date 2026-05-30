import { Link } from "@tanstack/react-router";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";
import { setProductCache } from "@/src/lib/productCache";
import { Chip, PriceTag } from "@/components/ui";

// The product currently being opened/returned-to. Only this card gets a
// `view-transition-name`, so just ONE photo morphs into the detail hero — the
// other cards move with the page instead of each animating on their own.
let morphProductId = null;

function ImagePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-10 h-10 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function PinIcon() {
  return (
    <svg className="w-3 h-3 text-[var(--color-ink-fade)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function FeaturedStar() {
  return (
    <span
      title={m.featured()}
      className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-[var(--color-ember-500)] text-white shadow-[0_2px_6px_-2px_rgba(237,0,64,0.6)]"
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.39 6.96H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.55L2 8.96h7.61L12 2z" />
      </svg>
    </span>
  );
}

export default function ProductCard({ product, onSave }) {
  const locale = getLocale();
  const photo = product.photos?.[0];
  const cityLabel = product.city ? (getCityLabel(product.city, locale) ?? product.city) : null;
  const categoryLabel = getCategoryLabel(product.category, locale);
  setProductCache(product);

  // Tag only the tapped card for the shared-element morph, synchronously,
  // just before navigating — so the photo expands into the detail hero while
  // the rest of the grid stays part of the page transition.
  const handleClick = (e) => {
    morphProductId = product._id;
    const img = e.currentTarget.querySelector("img");
    if (img) img.style.viewTransitionName = `vt-${product._id}`;
    onSave?.();
  };

  return (
    <Link to={`/products/${product._id}`} className="group block" onClick={handleClick}>
      <article className="bg-paper rounded-2xl overflow-hidden border border-[var(--color-hairline)] transition-all duration-300 hover:border-[var(--color-ember-200)] hover:shadow-[0_18px_36px_-22px_rgba(11,12,15,0.22)] hover:-translate-y-0.5 active:scale-[0.98]">
        {/* Image */}
        <div className="aspect-[4/5] relative overflow-hidden bg-[var(--color-sand)]">
          {photo ? (
            <img
              src={photo}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[500ms] ease-out"
              style={product._id === morphProductId ? { viewTransitionName: `vt-${product._id}` } : undefined}
            />
          ) : <ImagePlaceholder />}

          {/* Only one chip on the image: condition. */}
          <Chip
            tone={product.condition === "new" ? "success" : "warning"}
            dot
            className="absolute top-2.5 start-2.5 backdrop-blur-md shadow-sm"
          >
            {product.condition === "new" ? m.badgeNew() : m.badgeUsed()}
          </Chip>

          {/* Featured indicator: small star pill, top-end */}
          {product.featured && (
            <span className="absolute top-2.5 end-2.5">
              <FeaturedStar />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="px-3 pt-2.5 pb-3">
          <h3 className="text-[13.5px] font-semibold text-[var(--color-ink)] line-clamp-2 leading-snug min-h-[2.5rem] mb-1.5">
            {product.title}
          </h3>

          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-fade)] mb-2 min-w-0">
            <span className="truncate">{categoryLabel}</span>
            {cityLabel && (
              <>
                <span className="text-[var(--color-ink-fade)]/60">·</span>
                <PinIcon />
                <span className="truncate">{cityLabel}</span>
              </>
            )}
          </div>

          <PriceTag amount={product.price} size="md" />
        </div>
      </article>
    </Link>
  );
}
