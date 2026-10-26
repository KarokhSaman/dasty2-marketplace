// Stops the page scrolling behind an open panel or sheet, and keeps it exactly
// where it was: closing puts the reader back at the same spot in the list.
// (Setting only `overflow: hidden` on <body> made the page jump to the top.)
// Panels can open over each other (a product from a seller's panel), so locks
// are counted: the page is held by the first and released by the last.
let count = 0;
let saved = null;

export function lockScroll() {
  if (typeof window === "undefined") return () => {};
  if (count === 0) {
    const y = window.scrollY;
    const s = document.body.style;
    saved = { y, position: s.position, top: s.top, left: s.left, right: s.right, width: s.width, overflow: s.overflow };
    s.position = "fixed";
    s.top = `-${y}px`;
    s.left = "0";
    s.right = "0";
    s.width = "100%";
    s.overflow = "hidden";
  }
  count++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    count--;
    if (count === 0 && saved) {
      const { y, ...previous } = saved;
      saved = null;
      Object.assign(document.body.style, previous);
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    }
  };
}
