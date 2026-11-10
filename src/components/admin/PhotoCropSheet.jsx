import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Cuts a product photo down to the part the admin keeps, like a phone's photo
// editor: drag the box's corners and edges, or inside it to move it. A ratio
// chip locks its shape (then only the corners resize). Saving gives the kept
// part as fractions of the photo; the caller makes and uploads the new photo.

const RATIOS = [
  { key: "free", label: "Free", r: null },
  { key: "square", label: "Square", r: 1 },
  { key: "4:5", label: "4:5", r: 4 / 5 },
  { key: "3:4", label: "3:4", r: 3 / 4 },
];
const MIN = 40; // smallest side of the box, in screen pixels
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const GRID = "linear-gradient(90deg, transparent calc(33.33% - 0.5px), #fff calc(33.33% - 0.5px), #fff calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), #fff calc(66.66% - 0.5px), #fff calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(transparent calc(33.33% - 0.5px), #fff calc(33.33% - 0.5px), #fff calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), #fff calc(66.66% - 0.5px), #fff calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))";

// The box after dragging `mode` ("move", an edge n/e/s/w, or a corner
// nw/ne/sw/se) by dx/dy, kept inside the W×H photo. With a ratio the corner
// opposite the dragged one stays put.
function dragBox(mode, s, dx, dy, r, W, H) {
  if (mode === "move") return { ...s, x: clamp(s.x + dx, 0, W - s.w), y: clamp(s.y + dy, 0, H - s.h) };
  const west = mode.includes("w"), north = mode.includes("n");
  const east = mode.includes("e"), south = mode.includes("s");
  let x0 = s.x, y0 = s.y, x1 = s.x + s.w, y1 = s.y + s.h;
  if (west) x0 = clamp(x0 + dx, 0, x1 - MIN);
  if (east) x1 = clamp(x1 + dx, x0 + MIN, W);
  if (north) y0 = clamp(y0 + dy, 0, y1 - MIN);
  if (south) y1 = clamp(y1 + dy, y0 + MIN, H);
  if (!r) return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const ax = west ? s.x + s.w : s.x, ay = north ? s.y + s.h : s.y;
  const room = Math.min(west ? ax : W - ax, (north ? ay : H - ay) * r);
  const w = clamp((x1 - x0 + (y1 - y0) * r) / 2, Math.min(MIN, room), room);
  const h = w / r;
  return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
}

// The biggest box of ratio r inside the photo, centred where the box was.
function fitRatio(r, s, W, H) {
  const w = Math.min(W, H * r), h = w / r;
  return { x: clamp(s.x + s.w / 2 - w / 2, 0, W - w), y: clamp(s.y + s.h / 2 - h / 2, 0, H - h), w, h };
}

// Each corner handle is a 32px touch target centred on its corner, drawing an
// "L" whose point sits on the corner.
const CORNERS = [
  ["nw", "cursor-nwse-resize", "left-4 top-4 border-t-[3px] border-l-[3px]"],
  ["ne", "cursor-nesw-resize", "right-4 top-4 border-t-[3px] border-r-[3px]"],
  ["sw", "cursor-nesw-resize", "left-4 bottom-4 border-b-[3px] border-l-[3px]"],
  ["se", "cursor-nwse-resize", "right-4 bottom-4 border-b-[3px] border-r-[3px]"],
];

export default function PhotoCropSheet({ url, note, onClose, onSave }) {
  const areaRef = useRef(null);
  const drag = useRef(null);
  const [nat, setNat] = useState(null); // the photo's own size
  const [failed, setFailed] = useState(false);
  const [room, setRoom] = useState(null); // space for the photo on screen
  const [ratio, setRatio] = useState("free");
  const [part, setPart] = useState({ x: 0, y: 0, w: 1, h: 1 }); // kept part, as fractions
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setFailed(true);
    img.src = url;
  }, [url]);
  useEffect(() => {
    const el = areaRef.current;
    const measure = () => setRoom({ w: el.clientWidth - 32, h: el.clientHeight - 24 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const scale = nat && room ? Math.max(0, Math.min(room.w / nat.w, room.h / nat.h)) : 0;
  const W = nat ? nat.w * scale : 0, H = nat ? nat.h * scale : 0;
  const box = { x: part.x * W, y: part.y * H, w: part.w * W, h: part.h * H };
  const r = RATIOS.find((x) => x.key === ratio).r;
  const toPart = (b) => ({ x: b.x / W, y: b.y / H, w: b.w / W, h: b.h / H });

  const start = (mode) => (e) => {
    if (busy) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, box };
  };
  const move = (e) => {
    const d = drag.current;
    if (d) setPart(toPart(dragBox(d.mode, d.box, e.clientX - d.px, e.clientY - d.py, r, W, H)));
  };
  const end = () => { drag.current = null; };
  const handle = (mode) => ({ onPointerDown: start(mode), onPointerMove: move, onPointerUp: end, onPointerCancel: end });

  const pickRatio = (key) => {
    setRatio(key);
    const next = RATIOS.find((x) => x.key === key).r;
    if (next && W) setPart(toPart(fitRatio(next, box, W, H)));
  };
  const reset = () => { setRatio("free"); setPart({ x: 0, y: 0, w: 1, h: 1 }); };
  const whole = part.w > 0.995 && part.h > 0.995;
  const outW = nat ? Math.round(part.w * nat.w) : 0, outH = nat ? Math.round(part.h * nat.h) : 0;

  async function save() {
    setBusy(true);
    try { await onSave(part); } finally { setBusy(false); }
  }

  return createPortal(
    <div className="adm-scope fixed inset-0 z-[90] bg-[#0b0c0f] text-white flex flex-col" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onClose} disabled={busy} className="text-[15px] text-white/90 w-16 text-start">Cancel</button>
        <span className="text-[16px] font-bold">Crop photo</span>
        <button type="button" onClick={reset} disabled={busy || whole} className="text-[15px] text-white/90 w-16 text-end disabled:opacity-40">Reset</button>
      </div>

      <div ref={areaRef} className="flex-1 min-h-0 grid place-items-center">
        {failed ? (
          <p className="text-[13px] text-white/70">Could not load the photo.</p>
        ) : !nat ? (
          <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <div dir="ltr" className="relative touch-none select-none" style={{ width: W, height: H }}>
            {/* The photo and the dimmed outside are clipped to the photo; the
                handles below are not, so the half of each that sits outside
                the photo's edge can still be grabbed. */}
            <div className="absolute inset-0 overflow-hidden">
              <img src={url} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
              <div className="absolute cursor-move" {...handle("move")}
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", outline: "1.5px solid #fff" }}>
                <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: GRID }} />
              </div>
            </div>
            {!r && [["n", box.x + box.w / 2, box.y], ["s", box.x + box.w / 2, box.y + box.h], ["w", box.x, box.y + box.h / 2], ["e", box.x + box.w, box.y + box.h / 2]].map(([mode, x, y]) => (
              <div key={mode} {...handle(mode)} className={`absolute w-9 h-9 grid place-items-center ${mode === "n" || mode === "s" ? "cursor-ns-resize" : "cursor-ew-resize"}`} style={{ left: x - 18, top: y - 18 }}>
                <span className={`rounded-full bg-white shadow ${mode === "n" || mode === "s" ? "w-5 h-[4px]" : "w-[4px] h-5"}`} />
              </div>
            ))}
            {CORNERS.map(([mode, cursor, edge]) => (
              <div key={mode} {...handle(mode)} className={`absolute w-8 h-8 ${cursor}`}
                style={{ left: (mode.includes("w") ? box.x : box.x + box.w) - 16, top: (mode.includes("n") ? box.y : box.y + box.h) - 16 }}>
                <span className={`absolute w-[18px] h-[18px] border-white ${edge}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className="flex justify-center gap-2 mb-3">
          {RATIOS.map((x) => (
            <button key={x.key} type="button" onClick={() => pickRatio(x.key)} disabled={busy || !nat}
              className={`h-9 px-3.5 rounded-full text-[13px] font-semibold ${ratio === x.key ? "bg-white text-[#0b0c0f]" : "bg-white/10 text-white/85"}`}>
              {x.label}
            </button>
          ))}
        </div>
        {nat && (
          <p className="text-center text-[12px] text-white/60" dir="ltr">
            {outW} × {outH} px{Math.min(outW, outH) < 500 ? " · small, may look blurry" : ""}
          </p>
        )}
        {note && <p className="text-center text-[12px] text-[#f5c26b] mt-1">{note}</p>}
        <p className="text-center text-[11.5px] text-white/45 mt-1 mb-3">Replaces the photo. The uncropped photo can't be brought back.</p>
        <button type="button" onClick={save} disabled={busy || whole || !nat}
          className="w-full h-12 rounded-2xl bg-[#c80037] text-[15px] font-bold disabled:opacity-40">
          {busy ? "Saving…" : "Save crop"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
