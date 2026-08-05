import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";
import { Chip } from "@/components/ui";

function VIPCard({ product, onViewProduct }) {
  const locale = getLocale();
  const categoryLabel = getCategoryLabel(product.category, locale);
  const cityLabel = getCityLabel(product.city, locale);

  return (
    <Link
      to={`/products/${product._id}`}
      onClick={onViewProduct}
      className="relative block aspect-[4/3] rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
    >
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {product.photos?.[0] ? (
          <img
            src={product.photos[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      {/* Content overlay */}
      {/* VIP Header */}
      <div className="absolute top-3 start-3 flex items-center gap-2 z-10">
        <span
          title={m.featured()}
          className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-[var(--color-ember-500)] text-white shadow-[0_2px_6px_-2px_rgba(237,0,64,0.6)]"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.39 6.96H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.55L2 8.96h7.61L12 2z" />
          </svg>
        </span>
        <span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-lg">VIP</span>
      </div>

      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 md:p-6">
        {/* Title */}
        <h2 className="text-sm md:text-base lg:text-lg font-bold text-white leading-tight mb-1 line-clamp-2 drop-shadow-lg">
          {product.title}
        </h2>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-white mb-3 drop-shadow-lg font-medium">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <svg
              className="w-3 h-3 text-white/70 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="line-clamp-1">{categoryLabel}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <svg
              className="w-3 h-3 text-white/70 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <span className="line-clamp-1">{cityLabel}</span>
          </span>
        </div>

        {/* Price and Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 drop-shadow-lg min-w-0">
            <span className="text-base md:text-lg lg:text-xl font-bold text-[var(--color-ember-300)] truncate">
              {(product.price ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] md:text-xs text-white/80 flex-shrink-0">IQD</span>
          </div>

          {/* Badge */}
          <Chip
            tone={product.condition === "new" ? "success" : product.condition === "likenew" ? "neutral" : "warning"}
            dot
            className="backdrop-blur-md shadow-sm flex-shrink-0"
          >
            {product.condition === "new"
              ? m.badgeNew?.()
              : product.condition === "likenew"
              ? m.conditionLikeNew?.()
              : m.badgeUsed?.()}
          </Chip>
        </div>
      </div>
    </Link>
  );
}

export default function VIPSpotlight({ products = [], onViewProduct }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through featured products every 10 seconds
  useEffect(() => {
    if (products.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 4;
        // Loop back to start if we've reached the end
        return nextIndex >= products.length ? 0 : nextIndex;
      });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [products.length]);

  if (!products || products.length === 0) return null;

  // Get the current 4 products to display
  const visibleProducts = products.slice(currentIndex, currentIndex + 4);

  return (
    <div className="hidden xl:block bg-gradient-to-tl from-[var(--color-ember-100)]/80 via-white/95 to-[var(--color-sand)] rounded-3xl p-6 mb-10 shadow-lg">
      <div className="grid grid-cols-4 gap-4">
        {visibleProducts.map((product) => (
          <VIPCard key={product._id} product={product} onViewProduct={onViewProduct} />
        ))}
      </div>

      {/* Carousel Indicator */}
      {products.length > 4 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(products.length / 4) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx * 4)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === Math.floor(currentIndex / 4)
                  ? "bg-[var(--color-ember-600)] w-6"
                  : "bg-[var(--color-ember-200)] w-2"
              }`}
              aria-label={`Show featured products ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
