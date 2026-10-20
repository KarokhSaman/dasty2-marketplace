import { useLayoutEffect, useRef, useState } from "react";

// Space kept free at the bottom for the fixed mobile nav bars, and at the top for
// the sticky header.
const RESERVE_BOTTOM = 88;
const RESERVE_TOP = 72;

const GAPS = {
  "1": ["mt-1", "mb-1"],
  "1.5": ["mt-1.5", "mb-1.5"],
  "2": ["mt-2", "mb-2"],
};

/**
 * A floating panel for a dropdown/popover. Put it inside the `relative` wrapper
 * that holds the trigger: it opens below the trigger, or above it when there is
 * not enough room below (e.g. on the last item of a page, or next to the bottom
 * nav) and there is more room above.
 *
 * `height` is the panel's approximate height, used to decide whether it fits.
 */
export default function FlipPanel({ children, className = "", height = 240, gap = "2" }) {
  const ref = useRef(null);
  const [up, setUp] = useState(false);

  useLayoutEffect(() => {
    const anchor = ref.current?.parentElement;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - RESERVE_BOTTOM;
    const above = rect.top - RESERVE_TOP;
    setUp(below < height && above > below);
  }, [height]);

  const [mt, mb] = GAPS[gap] ?? GAPS["2"];
  return (
    <div ref={ref} className={`absolute ${up ? `bottom-full ${mb}` : `top-full ${mt}`} ${className}`}>
      {children}
    </div>
  );
}
