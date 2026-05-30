import { useEffect, useRef, useState } from "react";

function ImagePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg className="w-14 h-14 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

/**
 * Swipeable image gallery — CSS scroll-snap track with dot indicators and a
 * counter. Active slide is tracked via IntersectionObserver, which is
 * geometry-based and therefore RTL-safe. Navigation uses scrollIntoView
 * (also direction-agnostic). Falls back to a placeholder when empty.
 */
export default function Gallery({
  photos = [],
  alt = "",
  className = "",
  aspectClassName = "aspect-square",
  rounded = "rounded-2xl",
  heroTransitionName,
}) {
  const valid = (photos || []).filter(Boolean);
  const count = valid.length;
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count <= 1) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = Number(e.target.dataset.idx);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root: track, threshold: [0.6] },
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);

  const goTo = (idx) => {
    const el = slideRefs.current[idx];
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const onKey = (e) => {
    if (count <= 1) return;
    if (e.key === "ArrowRight") goTo(Math.min(active + 1, count - 1));
    if (e.key === "ArrowLeft") goTo(Math.max(active - 1, 0));
  };

  if (count === 0) {
    return (
      <div className={`${aspectClassName} ${rounded} bg-[var(--color-sand)] flex items-center justify-center ${className}`}>
        <ImagePlaceholder />
      </div>
    );
  }

  return (
    <div
      className={`relative ${rounded} overflow-hidden bg-[var(--color-sand)] ${className}`}
      onKeyDown={onKey}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
    >
      <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {valid.map((src, i) => (
          <div
            key={i}
            data-idx={i}
            ref={(el) => (slideRefs.current[i] = el)}
            className={`shrink-0 w-full snap-center ${aspectClassName}`}
          >
            <img
              src={src}
              alt={count > 1 ? `${alt} — ${i + 1}/${count}` : alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover"
              style={i === 0 && heroTransitionName ? { viewTransitionName: heroTransitionName } : undefined}
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          {/* legibility scrim for the dots */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />

          <span className="absolute top-3 end-3 chip-base bg-[rgba(11,12,15,0.62)] text-white backdrop-blur-md tabular-nums">
            {active + 1}/{count}
          </span>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {valid.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
