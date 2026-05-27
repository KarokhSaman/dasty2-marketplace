import { useEffect } from "react";

/**
 * Calls `handler` when a pointerdown/mousedown occurs outside the element
 * referenced by `ref`. `enabled=false` skips the listener so closed popovers
 * don't pay the cost.
 */
export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler(e);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, enabled]);
}
