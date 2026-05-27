import { useRef, useState } from "react";
import { useClickOutside } from "./useClickOutside";

/**
 * Generic anchored dropdown. Renders a trigger button; on click opens
 * `content` in a positioned popover.
 *
 *   <Popover
 *     trigger={({ open }) => <button>...</button>}
 *     align="end"   // "start" | "end" | "center"
 *     width="w-[300px]"
 *   >
 *     {({ close }) => (...)}
 *   </Popover>
 */
const ALIGN = {
  start:  "start-0",
  end:    "end-0",
  center: "left-1/2 -translate-x-1/2",
};

export default function Popover({
  trigger,
  align = "end",
  width = "w-[280px]",
  children,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`absolute ${ALIGN[align]} top-full mt-2 z-40 ${width} bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_24px_56px_-20px_rgba(26,20,17,0.30)] overflow-hidden scale-in origin-top`}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}
