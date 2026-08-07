import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";

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
            className="w-full h-full object-cover object-center"
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
                ? m.badgeNew()
                : product.condition === "likenew"
                ? m.conditionLikeNew()
                : m.badgeUsed()}
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

  // Dynamically determine layers based on number of products
  const getCardOffsets = () => {
    const numProducts = products.length;
    if (numProducts >= 9) return [4, 3, 2, 1, 0, 1, 2, 3, 4]; // 4 layers
    if (numProducts >= 7) return [3, 2, 1, 0, 1, 2, 3]; // 3 layers
    if (numProducts >= 5) return [2, 1, 0, 1, 2]; // 2 layers
    if (numProducts >= 3) return [1, 0, 1]; // 1 layer
    return [0]; // Center only
  };

  const cardOffsets = getCardOffsets();
  const centerIdx = Math.floor(cardOffsets.length / 2);

  // Helper function to get scale based on offset
  const getScale = (offset, maxOffset) => {
    if (offset === 0) return 1;
    const scaleStep = 0.12;
    return Math.max(0.55, 1 - offset * scaleStep);
  };

  // Helper function to get z-index based on offset
  const getZIndex = (offset, maxOffset) => {
    return 50 - offset * 10;
  };

  // Helper function to get x-offset based on position
  const getXOffset = (idx, offset, maxOffset) => {
    const maxXOffset = 600;
    const xStep = maxXOffset / (maxOffset + 1);
    if (idx < centerIdx) return -(centerIdx - idx) * xStep;
    if (idx > centerIdx) return (idx - centerIdx) * xStep;
    return 0;
  };

  // Helper function to get opacity based on offset
  const getOpacity = (offset, maxOffset) => {
    if (offset === 0) return 1;
    const opacityStep = 0.13;
    return Math.max(0.55, 1 - offset * opacityStep);
  };

  return (
    <div className="hidden xl:block p-6 mb-10">
      {/* Dynamic Stacked Carousel Display */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center mb-6 h-60 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {cardOffsets.map((offset, idx) => {
            const productIdx = (currentIndex - centerIdx + idx + products.length) % products.length;
            const product = products[productIdx];
            const isCenter = idx === centerIdx;
            const maxOffset = Math.max(...cardOffsets.map(Math.abs));

            const scale = getScale(offset, maxOffset);
            const zIndex = getZIndex(offset, maxOffset);
            const xOffset = getXOffset(idx, offset, maxOffset);
            const opacity = getOpacity(offset, maxOffset);
            const rotation = 0;

            return (
              <div
                key={productIdx}
                className="absolute rounded-3xl overflow-hidden shadow-lg cursor-pointer"
                style={{
                  width: `${280 * scale}px`,
                  height: `${280 * scale}px`,
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${xOffset}px), calc(-50%)) scale(${scale}) rotateZ(${rotation}deg)`,
                  zIndex: zIndex,
                  transformOrigin: "center center",
                  opacity: opacity,
                  transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  willChange: "transform, opacity",
                  WebkitBackfaceVisibility: "hidden",
                  backfaceVisibility: "hidden",
                }}
              >
                <VIPCard product={product} onViewProduct={onViewProduct} isCenter={isCenter} />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
