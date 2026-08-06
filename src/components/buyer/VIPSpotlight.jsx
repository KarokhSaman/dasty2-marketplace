import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";
import { Chip } from "@/components/ui";

function VIPCard({ product, onViewProduct, isCenter }) {
  const locale = getLocale();
  const categoryLabel = getCategoryLabel(product.category, locale);
  const cityLabel = getCityLabel(product.city, locale);

  return (
    <Link
      to={`/products/${product._id}`}
      onClick={onViewProduct}
      className="relative block w-full h-full rounded-3xl overflow-hidden shadow-lg cursor-pointer group"
    >
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {product.photos?.[0] ? (
          <img
            src={product.photos[0]}
            alt={product.title}
            className="w-full h-full object-cover"
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

      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/10 to-transparent" />

      {/* VIP Badge */}
      <div className="absolute top-3 start-3 z-10">
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-[var(--color-ember-500)] to-[var(--color-ember-600)] text-white shadow-[0_4px_12px_-2px_rgba(237,0,64,0.4)] font-bold uppercase tracking-widest text-[10px]">
          VIP
        </span>
      </div>

      {/* Product Info at Bottom - Only show for center card */}
      {isCenter && (
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Title */}
          <h3 className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
            {product.title}
          </h3>

          {/* City and Condition Tags */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
              {getCityLabel(product.city, locale)}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              product.condition === "new"
                ? "bg-green-500/30 text-green-200"
                : product.condition === "likenew"
                ? "bg-gray-500/30 text-gray-200"
                : "bg-yellow-500/30 text-yellow-200"
            }`}>
              {product.condition === "new"
                ? m.badgeNew?.()
                : product.condition === "likenew"
                ? m.conditionLikeNew?.()
                : m.badgeUsed?.()}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-ember-300)]">
              {(product.price ?? 0).toLocaleString()}
            </span>
            <span className="text-sm text-white/80">IQD</span>
          </div>
        </div>
      )}

    </Link>
  );
}

export default function VIPSpotlight({ products = [], onViewProduct }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const containerRef = useRef(null);
  const lastDragRef = useRef(0);

  if (!products || products.length === 0) return null;

  // Auto-rotate every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [products.length]);

  // Handle horizontal drag/swipe
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragEnd = e.clientX;
    const diff = dragStart - dragEnd;
    const now = Date.now();

    // Throttle - only advance every 1000ms
    if (now - lastDragRef.current < 1000) {
      return;
    }

    // Require at least 50px drag to advance
    if (Math.abs(diff) > 50) {
      lastDragRef.current = now;

      if (diff > 0) {
        // Dragged left - advance
        setCurrentIndex((prev) => (prev + 1) % products.length);
      } else {
        // Dragged right - go back
        setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
      }
    }
  };

  const handleTouchStart = (e) => {
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = dragStart - touchEnd;
    const now = Date.now();

    if (now - lastDragRef.current < 1000) {
      return;
    }

    if (Math.abs(diff) > 50) {
      lastDragRef.current = now;

      if (diff > 0) {
        // Swiped left - advance
        setCurrentIndex((prev) => (prev + 1) % products.length);
      } else {
        // Swiped right - go back
        setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
      }
    }
  };

  return (
    <div className="hidden xl:block p-6 mb-10">
      {/* 5-Card Stacked Carousel Display - Horizontal Drag Carousel */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center mb-6 h-96 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-96 h-96">
          {[2, 1, 0, 1, 2].map((offset, idx) => {
            const productIdx = (currentIndex - 2 + idx + products.length) % products.length;
            const product = products[productIdx];
            const isCenter = idx === 2;

            // Calculate scale based on distance from center
            const scale = isCenter ? 1 : (offset === 1 ? 0.85 : 0.75);
            const zIndex = isCenter ? 30 : (offset === 1 ? 20 : 10);

            // Position cards - spread horizontally, aligned vertically to center
            let xOffset = 0;
            if (idx === 0) xOffset = -400; // Layer 2 left
            if (idx === 1) xOffset = -240; // Layer 1 left
            if (idx === 3) xOffset = 240;  // Layer 1 right
            if (idx === 4) xOffset = 400;  // Layer 2 right

            const yOffset = 0; // All aligned at same vertical center

            // Calculate opacity and rotation based on position
            const opacityMultiplier = isCenter ? 1 : (offset === 1 ? 0.85 : 0.7);
            const rotation = isCenter ? 0 : (offset === 1 ? 2 : 4);

            return (
              <div
                key={productIdx}
                className="absolute rounded-3xl overflow-hidden shadow-lg cursor-pointer"
                style={{
                  width: `${340 * scale}px`,
                  height: `${340 * scale}px`,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px)) scale(${scale}) rotateZ(${rotation}deg)`,
                  zIndex: zIndex,
                  transformOrigin: "center center",
                  opacity: opacityMultiplier,
                  transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <VIPCard product={product} onViewProduct={onViewProduct} isCenter={isCenter} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-6 mt-8">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + products.length) % products.length)}
          className="p-2 rounded-full bg-white border border-[var(--color-hairline)] hover:bg-[var(--color-cream)] transition-colors"
          aria-label="Previous product"
        >
          <svg className="w-5 h-5 text-[var(--color-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Indicator Dots - Max 10 */}
        <div className="flex gap-2">
          {(() => {
            const maxDots = 10;
            const dotsToShow = Math.min(maxDots, products.length);
            const productsPerDot = Math.ceil(products.length / dotsToShow);
            const currentDot = Math.floor(currentIndex / productsPerDot);

            return Array.from({ length: dotsToShow }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx * productsPerDot)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentDot
                    ? "bg-[var(--color-ember-600)] w-6"
                    : "bg-[var(--color-ember-200)] w-2 hover:bg-[var(--color-ember-300)]"
                }`}
                aria-label={`Go to product group ${idx + 1}`}
              />
            ));
          })()}
        </div>

        {/* Next Button */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % products.length)}
          className="p-2 rounded-full bg-white border border-[var(--color-hairline)] hover:bg-[var(--color-cream)] transition-colors"
          aria-label="Next product"
        >
          <svg className="w-5 h-5 text-[var(--color-ink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  );
}
