import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { brandFitsCategory, getBrandChoices } from "@/lib/brands";
import { priceInfo } from "@/convex/discount";
import { rotatePhoto } from "@/lib/rotateImage";
import { STORY_PHOTO_ASPECT } from "@/lib/storyImage";
import { useImageUpload } from "@/lib/useImageUpload";
import { errorMessage } from "@/lib/errors";
import { photoProps } from "@/lib/images";
import { useProductActions } from "@/components/admin/useProductActions";
import { actionLabel } from "@/components/admin/logActions";
import { approvalMessage } from "@/components/admin/approvalMessage";
import {
  Panel, StatusChip, StoreTag, Code, SectionTitle, Segmented, Switch, ConfirmBox, AmountInput, Avatar, Thumb,
  btn, fmtIQD, inputCls, labelCls, useToast, useCopy, waLink, ltrPhone,
  IconRotate, IconStar, IconTrash, IconCheck, IconX, IconCopy, IconWhatsApp, IconExternal, IconCrop,
} from "@/components/admin/ui";

const CONDITIONS = [
  { value: "new", label: () => m.conditionNew() },
  { value: "likenew", label: () => m.conditionLikeNew() },
  { value: "used", label: () => m.conditionUsed() },
];

// Reject reasons are always in Kurdish, whatever language the admin page is
// in, since the seller reads them.
const KU = { locale: "ckb" };
export const REJECT_REASONS = [
  () => m.rejectReasonPhotos({}, KU), () => m.rejectReasonCategory({}, KU), () => m.rejectReasonPrice({}, KU),
  () => m.rejectReasonNotBaby({}, KU), () => m.rejectReasonDuplicate({}, KU), () => m.rejectReasonDetails({}, KU),
  () => m.rejectReasonOwnPhoto({}, KU),
];

const isSoldish = (p) => p.status === "sold" || p.status === "paid";
const shownPrice = (p) => (isSoldish(p) ? (p.salePrice ?? p.price) : p.price);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const timeAgo = (iso) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : day(iso);
};

// Reject with a reason: tap a ready reason (in Kurdish, as the seller sees it)
// or write one.
export function RejectBox({ onReject, onCancel, busy }) {
  const [reason, setReason] = useState("");
  return (
    <div className="rounded-2xl bg-st-rejected-bg p-3.5 space-y-2.5">
      <p className="text-[13px] font-bold text-adm-ink">{m.adminRejectReason()}</p>
      <div className="flex flex-wrap gap-1.5">
        {REJECT_REASONS.map((r) => (
          <button key={r()} type="button" onClick={() => setReason(r())}
            className={`h-8 px-3 rounded-full border text-[12.5px] font-semibold ${reason === r() ? "bg-st-rejected text-white border-st-rejected" : "border-st-rejected/40 text-st-rejected bg-adm-surface"}`}>
            {r()}
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} dir="auto" placeholder={m.adminRejectPlaceholder()}
        className={`${inputCls} h-auto py-2.5 resize-none`} />
      <div className="flex gap-2">
        <button type="button" disabled={!reason.trim() || busy} onClick={() => onReject(reason)} className={`${btn("primary")} flex-1`}>{m.adminRejectSubmit()}</button>
        {onCancel && <button type="button" onClick={onCancel} className={`${btn("outline")} flex-1`}>{m.adminCancel()}</button>}
      </div>
      <p className="text-[11.5px] text-adm-soft">The seller is notified with this reason and can fix and resubmit.</p>
    </div>
  );
}

// Admin adds photos to a seller's product (e.g. better shots of a branded
// item), up to the 5-photo limit. Uploads finish first, then one save.
const MAX_PHOTOS = 5;
function AddPhotoTile({ product, actions, toast }) {
  const upload = useImageUpload();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const room = MAX_PHOTOS - (product.photos?.length ?? 0);

  async function addFiles(e) {
    const files = Array.from(e.target.files ?? []).slice(0, room);
    e.target.value = "";
    if (!files.length) return;
    setUploading(files.length);
    const results = await Promise.allSettled(files.map((file) => upload(file)));
    const urls = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failed = results.length - urls.length;
    try {
      if (urls.length) {
        await actions.addPhotos(product, urls);
        toast(urls.length === 1 ? "Photo added" : `${urls.length} photos added`);
      }
      if (failed) toast(`${failed} could not be uploaded: JPEG, PNG or WEBP, 8 MB max`, "error");
    } catch (err) {
      toast(errorMessage(err, "Could not add the photos"), "error");
    } finally {
      setUploading(0);
    }
  }

  return (
    <>
      {Array.from({ length: uploading }).map((_, i) => (
        <div key={`up${i}`} className="aspect-square rounded-xl bg-adm-sunk grid place-items-center">
          <span className="w-6 h-6 border-2 border-adm-line border-t-adm-accent rounded-full animate-spin" />
        </div>
      ))}
      {room > 0 && !uploading && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-xl border-[1.5px] border-dashed border-adm-fade bg-adm-surface flex flex-col items-center justify-center gap-1 text-[12px] font-bold text-adm-soft hover:border-adm-accent hover:text-adm-accent">
          <svg className="w-6 h-6 text-adm-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" />
          </svg>
          Add photo
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={addFiles} />
    </>
  );
}

function PhotoTile({ product, url, index, isMain, onlyOne, actions, toast }) {
  const upload = useImageUpload();
  const [turns, setTurns] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function saveRotation() {
    setSaving(true);
    try {
      const file = await rotatePhoto(url, turns);
      const newUrl = await upload(file);
      await actions.swapPhoto(product, index, url, newUrl, turns);
      setTurns(0);
      toast("Photo rotated");
    } catch (err) {
      toast(errorMessage(err, "Could not rotate the photo"), "error");
    } finally {
      setSaving(false);
    }
  }

  const round = "w-8 h-8 rounded-full grid place-items-center shadow bg-white/95 text-[#0b0c0f]";
  return (
    <div className={`relative aspect-square rounded-xl overflow-hidden bg-adm-sunk ring-2 ${isMain ? "ring-adm-accent" : "ring-transparent"}`}>
      <img {...photoProps(url, 320)} alt="" className="w-full h-full object-cover transition-transform duration-200" style={turns ? { transform: `rotate(${turns * 90}deg)` } : undefined} />
      {isMain && <span className="absolute top-1.5 start-1.5 text-[10px] font-bold bg-adm-accent text-white rounded-full px-2 py-0.5">Main</span>}
      {saving ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40"><span className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>
      ) : confirmDel ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45">
          <button type="button" aria-label="Confirm delete photo" className="w-9 h-9 rounded-full grid place-items-center bg-st-rejected text-white shadow"
            onClick={async () => { setConfirmDel(false); try { await actions.removePhoto(product, index); toast("Photo deleted"); } catch (err) { toast(errorMessage(err, "Could not delete"), "error"); } }}>
            <IconCheck className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Keep photo" className={round} onClick={() => setConfirmDel(false)}><IconX className="w-4 h-4" /></button>
        </div>
      ) : turns ? (
        <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1.5">
          <button type="button" aria-label="Rotate again" className={round} onClick={() => setTurns((t) => (t + 1) % 4)}><IconRotate className="w-4 h-4" /></button>
          <button type="button" aria-label="Save rotation" className="w-8 h-8 rounded-full grid place-items-center shadow bg-[#c80037] text-white" onClick={saveRotation}><IconCheck className="w-4 h-4" /></button>
          <button type="button" aria-label="Cancel rotation" className={round} onClick={() => setTurns(0)}><IconX className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="absolute inset-x-1 bottom-1 flex justify-between">
          <button type="button" aria-label="Rotate photo" className={round} onClick={() => setTurns(1)}><IconRotate className="w-4 h-4" /></button>
          {isMain ? (
            <button type="button" aria-label="Story crop" title="Story crop" className="w-8 h-8 rounded-full grid place-items-center shadow bg-[#c80037] text-white"
              onClick={() => setCropping(true)}>
              <IconCrop className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" aria-label="Make main photo" className={round}
              onClick={async () => { await actions.setMainPhoto(product, index); toast("Main photo changed"); }}>
              <IconStar className="w-4 h-4" />
            </button>
          )}
          {!onlyOne && (
            <button type="button" aria-label="Delete photo" className={`${round} !text-[#c53030]`} onClick={() => setConfirmDel(true)}><IconTrash className="w-4 h-4" /></button>
          )}
        </div>
      )}
      {cropping && (
        <StoryCropSheet url={url} saved={product.storyCrop?.url === url ? product.storyCrop : null}
          onClose={() => setCropping(false)}
          onSave={async (crop) => {
            try {
              await actions.setStoryCrop(product, crop);
              toast(crop ? "Story crop saved" : "Story crop back to automatic");
              setCropping(false);
            } catch (err) {
              toast(errorMessage(err, "Could not save the crop"), "error");
            }
          }} />
      )}
    </div>
  );
}

// Admin frames the main photo for the Instagram story: drag to move, pinch,
// wheel or the slider to zoom, inside a frame the exact shape of the story's
// photo frame. Zooming out below "fill" fits more of the photo (a whole
// landscape photo, say); the part that shows is saved, as fractions of the
// photo, and the story's frame then takes that part's shape. "Automatic"
// clears it so the story's own crop is used again.
function StoryCropSheet({ url, saved, onClose, onSave }) {
  const frameRef = useRef(null);
  const [nat, setNat] = useState(null); // natural photo size
  const [box, setBox] = useState({ w: 300, h: 300 / STORY_PHOTO_ASPECT });
  const [view, setView] = useState(null); // { z, x, y }: zoom over cover-fit, offset in px
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  // the frame: as wide as fits, but short enough to leave room for the controls
  useEffect(() => {
    const fit = () => {
      const maxW = Math.min(360, window.innerWidth - 48);
      const maxH = Math.max(240, window.innerHeight - 330);
      const w = Math.min(maxW, maxH * STORY_PHOTO_ASPECT);
      setBox({ w, h: w / STORY_PHOTO_ASPECT });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // zoom 1 fills the frame; minZ fits the whole photo inside it
  const base = nat ? Math.max(box.w / nat.w, box.h / nat.h) : 1;
  const minZ = nat ? Math.min(box.w / nat.w, box.h / nat.h) / base : 1;
  // a side smaller than the frame stays centred; a bigger one can't leave a gap
  const along = (pos, size, room) => (size <= room ? (room - size) / 2 : Math.min(0, Math.max(room - size, pos)));
  const clamp = (v) => {
    const s = base * v.z;
    return { z: v.z, x: along(v.x, nat.w * s, box.w), y: along(v.y, nat.h * s, box.h) };
  };
  const whole = () => clamp({ z: minZ, x: 0, y: 0 });

  // start from the saved crop, or with the whole photo showing
  useEffect(() => {
    if (!nat) return;
    if (saved) {
      const cw = saved.w * nat.w, ch = saved.h * nat.h;
      const s = Math.min(box.w / cw, box.h / ch);
      setView(clamp({ z: s / base, x: (box.w - cw * s) / 2 - saved.x * nat.w * s, y: (box.h - ch * s) / 2 - saved.y * nat.h * s }));
    } else {
      setView(whole());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat, box.w, box.h]);

  const zoomTo = (z, cx = box.w / 2, cy = box.h / 2) => setView((v) => {
    const nz = Math.min(4, Math.max(minZ, z));
    const k = nz / v.z;
    return clamp({ z: nz, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
  });

  const local = (e) => {
    const r = frameRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    gesture.current = null;
  };
  const onMove = (e) => {
    if (!view || !pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (gesture.current) zoomTo(view.z * (dist / gesture.current), mid.x, mid.y);
      gesture.current = dist;
    } else {
      setView((v) => clamp({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }));
    }
  };
  const onUp = (e) => { pointers.current.delete(e.pointerId); gesture.current = null; };

  // the part of the photo that shows in the frame, as fractions
  const s = base * (view?.z ?? 1);
  const part = view && nat ? (() => {
    const x0 = Math.max(0, -view.x / s), y0 = Math.max(0, -view.y / s);
    const x1 = Math.min(nat.w, (box.w - view.x) / s), y1 = Math.min(nat.h, (box.h - view.y) / s);
    return { x: x0 / nat.w, y: y0 / nat.h, w: (x1 - x0) / nat.w, h: (y1 - y0) / nat.h };
  })() : null;

  // mini story preview: the story's photo area, with the frame taking the
  // shape of that part, centred in it as in the story
  const mini = 70;
  const areaW = mini * 0.866, areaH = areaW / STORY_PHOTO_ASPECT;
  const pk = part ? Math.min(areaW / (part.w * nat.w), areaH / (part.h * nat.h)) : 1;
  const fw = part ? part.w * nat.w * pk : areaW, fh = part ? part.h * nat.h * pk : areaH;

  async function save() {
    setBusy(true);
    await onSave({ url, ...part });
    setBusy(false);
  }
  async function automatic() {
    if (!saved) { onClose(); return; }
    setBusy(true);
    await onSave(null);
    setBusy(false);
  }

  return createPortal(
    <div className="adm-scope fixed inset-0 z-[90] bg-[#0b0c0f] text-white flex flex-col" role="dialog" aria-modal="true" aria-label="Story crop">
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onClose} className="text-[15px] text-white/90">Cancel</button>
        <span className="text-[16px] font-bold">Story crop</span>
        <span className="w-12" />
      </div>
      <div className="flex-1 flex flex-col items-center overflow-hidden">
        <div ref={frameRef} className="relative overflow-hidden rounded-[18px] bg-[#222] touch-none cursor-grab select-none"
          style={{ width: box.w, height: box.h }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onWheel={(e) => { if (view) zoomTo(view.z * (1 - e.deltaY * 0.002), local(e).x, local(e).y); }}>
          <img src={url} alt="" draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="absolute left-0 top-0 max-w-none pointer-events-none origin-top-left"
            style={view ? { width: nat.w * s, transform: `translate(${view.x}px, ${view.y}px)` } : { opacity: 0 }} />
          <div className="absolute inset-0 rounded-[18px] border-2 border-white pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none opacity-40"
            style={{ backgroundImage: "linear-gradient(90deg, transparent calc(33.33% - 0.5px), #fff calc(33.33% - 0.5px), #fff calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), #fff calc(66.66% - 0.5px), #fff calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(transparent calc(33.33% - 0.5px), #fff calc(33.33% - 0.5px), #fff calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), #fff calc(66.66% - 0.5px), #fff calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))" }} />
        </div>
        <p className="text-[12px] text-white/60 mt-2.5 px-6 text-center">Drag to move · pinch or use the slider to zoom · zoom out to fit the whole photo</p>
        <div className="flex items-center gap-3 w-full max-w-[360px] px-6 mt-2">
          <span className="text-white/60">−</span>
          <input type="range" min={minZ} max="4" step="any" value={view?.z ?? 1} aria-label="Zoom"
            onChange={(e) => view && zoomTo(+e.target.value)} className="flex-1 accent-[#ff1f58]" />
          <span className="text-white/60">+</span>
        </div>
        <div className="flex items-center gap-3 mt-3 mx-4 p-2.5 rounded-2xl bg-[#1b1c20] w-[calc(100%-32px)] max-w-[360px]">
          <div className="relative shrink-0 rounded-md bg-[#fefcf9] overflow-hidden" style={{ width: mini, height: mini * 16 / 9 }}>
            <div className="absolute overflow-hidden rounded-[3px] bg-white p-[1.5px]"
              style={{ left: mini * 0.067 + (areaW - fw) / 2, top: mini * 16 / 9 * 0.115 + (areaH - fh) / 2, width: fw, height: fh }}>
              <div className="relative w-full h-full overflow-hidden rounded-[2px]">
                {part && <img src={url} alt="" className="absolute left-0 top-0 max-w-none origin-top-left"
                  style={{ width: nat.w * pk, transform: `translate(${-part.x * nat.w * pk}px, ${-part.y * nat.h * pk}px)` }} />}
              </div>
            </div>
            <img src="/story-card.png" alt="" className="absolute" style={{ left: mini * 0.04, width: mini * 0.92, bottom: mini * 16 / 9 * 0.06 }} />
          </div>
          <p className="text-[12.5px] text-white/75 leading-snug">How it shows in the story. Anything outside the frame is left out.</p>
        </div>
      </div>
      <div className="flex gap-2.5 px-4 pt-3" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button type="button" disabled={busy} onClick={automatic} className="flex-1 h-12 rounded-2xl bg-[#24262b] font-bold">Automatic</button>
        <button type="button" disabled={busy || !view} onClick={save} className="flex-1 h-12 rounded-2xl bg-[#c80037] font-bold">Save</button>
      </div>
    </div>,
    document.body,
  );
}

const SPONSOR_FOR = [
  { label: "7 days", days: 7 }, { label: "14 days", days: 14 }, { label: "30 days", days: 30 }, { label: "No end date", days: null },
];

function SponsorBox({ product, actions, toast }) {
  const [open, setOpen] = useState(false);
  const [len, setLen] = useState(SPONSOR_FOR[0]);
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const on = !!product.featured;

  async function start() {
    setBusy(true);
    try {
      const until = len.days ? new Date(Date.now() + len.days * 864e5).toISOString().slice(0, 10) : undefined;
      await actions.sponsor(product, { until, position: pos, label: len.label });
      toast("Sponsored");
      setOpen(false);
    } catch (err) { toast(errorMessage(err, "Could not sponsor"), "error"); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 space-y-3">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-xl grid place-items-center ${on ? "bg-st-pending-bg text-st-pending" : "bg-adm-sunk text-adm-fade"}`}><IconStar filled={on} className="w-[18px] h-[18px]" /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold">Sponsored</p>
          <p className="text-[12px] text-adm-fade">
            {on ? [product.featuredUntil ? `Until ${product.featuredUntil}` : "No end date", product.featuredPosition ? `Position #${product.featuredPosition}` : "Auto position"].join(" · ") : "Shows at the top of the home page"}
          </p>
        </div>
        <Switch checked={on || open} label="Sponsored" onChange={(v) => { if (on && !v) setConfirmStop(true); else setOpen(v); }} />
      </div>
      {!on && open && (
        <div className="space-y-3">
          <div>
            <p className={labelCls}>For how long</p>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_FOR.map((o) => (
                <button key={o.label} type="button" onClick={() => setLen(o)}
                  className={`h-9 px-3 rounded-full border text-[12.5px] font-semibold ${len === o ? "bg-adm-ink text-adm-surface border-adm-ink" : "border-adm-line text-adm-soft"}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className={labelCls}>Position on the home page</p>
            <div className="grid grid-cols-6 gap-1.5">
              {[null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button key={n ?? "auto"} type="button" onClick={() => setPos(n)}
                  className={`h-9 rounded-lg text-[12.5px] font-semibold ${pos === n ? "bg-adm-ink text-adm-surface" : "bg-adm-sunk text-adm-soft"}`}>{n ?? "Auto"}</button>
              ))}
            </div>
            <p className="text-[11.5px] text-adm-fade mt-1">1 shows first. Auto puts it after the numbered ones, newest first.</p>
          </div>
          <button type="button" onClick={start} disabled={busy} className={`${btn("dark")} w-full`}>Sponsor for {len.label.toLowerCase()}</button>
        </div>
      )}
      {confirmStop && (
        <ConfirmBox title="Stop sponsoring?" text="It goes back to its normal place on the home page." confirmLabel="Stop sponsoring" tone="neutral"
          onCancel={() => setConfirmStop(false)}
          onConfirm={async () => { setConfirmStop(false); await actions.unsponsor(product); toast("No longer sponsored"); }} />
      )}
    </div>
  );
}

// Everything about one product in one place. `product` comes live from the
// products list, so changes show straight away.
export default function ProductPanel({ product, onClose }) {
  const actions = useProductActions();
  const toast = useToast();
  const copy = useCopy();
  const logs = useQuery(api.adminLogs.getAll);
  const [nextStatus, setNextStatus] = useState(null);
  const [salePrice, setSalePrice] = useState(0);
  const [ownProfit, setOwnProfit] = useState(0);
  const [busy, setBusy] = useState(false);
  // Products of our own stock (fee deal "own" on the store, or on the seller
  // when there's no store): we enter our profit at the sale.
  const sellers = useQuery(api.users.getAll);
  const stores = useQuery(api.stores.listAll);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("used");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const id = product?._id;
  useEffect(() => {
    if (!product) return;
    setTitle(product.title); setCategory(product.category); setBrand(product.brand ?? "");
    setCondition(product.storeId ? "new" : product.condition); setDescription(product.description ?? "");
    setPrice(shownPrice(product)); setNextStatus(null); setConfirmDelete(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const liveBrands = useQuery(api.products.listBrands, category ? { category } : "skip");
  const brandCounts = useMemo(() => Object.fromEntries((liveBrands ?? []).map((b) => [b.brand, b.count])), [liveBrands]);

  const history = useMemo(
    () => (logs ?? []).filter((l) => l.productId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [logs, id],
  );

  if (!product) return null;
  const p = product;
  const soldish = isSoldish(p);
  const dirty =
    title.trim() !== p.title || category !== p.category || (brand || "") !== (p.brand ?? "") ||
    condition !== (p.storeId ? "new" : p.condition) || description.trim() !== (p.description ?? "").trim() ||
    (price && price !== shownPrice(p));

  async function run(fn, done) {
    setBusy(true);
    try { await fn(); if (done) toast(done); setNextStatus(null); }
    catch (err) { toast(errorMessage(err, "Something went wrong"), "error"); }
    finally { setBusy(false); }
  }

  function chooseStatus(s) {
    if (s === p.status) { setNextStatus(null); return; }
    setNextStatus(s);
    if (s === "sold" || s === "paid") { setSalePrice(p.salePrice ?? priceInfo(p).price); setOwnProfit(isSoldish(p) ? p.profit ?? 0 : 0); }
  }

  async function saveDetails() {
    if (!title.trim()) { toast("Title is required", "error"); return; }
    await run(() => actions.saveDetails(p, { title: title.trim(), category, brand: brand || undefined, condition, description: description.trim(), price }), "Changes saved");
  }

  const discount = priceInfo(p);
  const dealSource = p.storeId
    ? (stores ?? []).find((st) => st._id === p.storeId)
    : (sellers ?? []).find((sl) => sl._id === p.sellerId);
  const isOwnStock = dealSource?.feeMode === "own";
  const main = p.mainPhotoIndex ?? 0;

  return (
    <Panel open onClose={onClose} wide
      leading={<Thumb src={p.photos?.[main]} size={44} />}
      title={p.title}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.seq && <Code>{p.seq}</Code>}
          {p.storeId && <StoreTag />}
          <StatusChip status={p.status} />
          {p.featured && <span className="text-st-pending"><IconStar filled className="w-3.5 h-3.5" /></span>}
        </div>
      }
      footer={
        <>
          <button type="button" onClick={() => setConfirmDelete(true)} className={btn("ghost")} aria-label="Delete product">
            <IconTrash className="w-4 h-4" /> <span className="max-sm:hidden">{m.adminDelete()}</span>
          </button>
          {p.status === "approved" && (
            <a href={`/products/${p._id}`} target="_blank" rel="noopener noreferrer" className={btn("ghost")} aria-label="Open on the site">
              <IconExternal className="w-4 h-4" /> <span className="max-sm:hidden">On site</span>
            </a>
          )}
          <div className="flex-1" />
          <button type="button" onClick={saveDetails} disabled={!dirty || busy} className={`${btn("dark", "lg")} min-w-[140px]`}>Save changes</button>
        </>
      }
    >
      {confirmDelete && (
        <ConfirmBox title="Delete this product?" text="It is removed for good, with its photos. This can't be undone." confirmLabel="Delete product" busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => run(async () => { await actions.remove(p); onClose(); }, "Product deleted")} />
      )}

      {p.soldReportedAt && p.status === "approved" && (
        <p className="rounded-2xl bg-st-sold-bg text-st-sold px-4 py-3 text-[13px] font-semibold">
          The seller says this sold ({new Date(p.soldReportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}). Set it to Sold below and confirm the sale price.
        </p>
      )}

      {/* Seller asked to delete */}
      {p.status === "deletion_requested" && (
        <div className="rounded-2xl bg-st-delete-bg p-3.5 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-st-delete">{m.adminDeleteReasonLabel()}</p>
          <p className="text-[14px] whitespace-pre-line">{p.deleteRequestReason || "—"}</p>
          {p.deleteRequestFrom && p.deleteRequestFrom !== "approved" && <p className="text-[12px] font-semibold text-st-delete">{m.adminDeleteFromPending()}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={btn("primary", "sm")} onClick={() => run(async () => { await actions.resolveDelete(p, "approve"); onClose(); }, "Deleted")}>{m.adminApproveDelete()}</button>
            {!(p.stock > 1) && (p.deleteRequestFrom ?? "approved") === "approved" && (
              <button type="button" disabled={busy} className={btn("outline", "sm")} onClick={() => run(() => actions.resolveDelete(p, "sold"), "Marked sold")}>{m.adminMarkSold()}</button>
            )}
            <button type="button" disabled={busy} className={btn("outline", "sm")} onClick={() => run(() => actions.resolveDelete(p, "reject"), "Kept live")}>Keep it live</button>
          </div>
        </div>
      )}

      {/* Status */}
      <section>
        <SectionTitle>Status</SectionTitle>
        <Segmented size="sm"
          value={nextStatus ?? p.status}
          onChange={chooseStatus}
          options={["pending", "approved", "rejected", "sold", "paid"].map((s) => ({
            value: s, label: s === "approved" ? m.statusApproved() : s === "pending" ? m.statusPending() : s === "rejected" ? m.statusRejected() : s === "sold" ? m.statusSold() : m.statusPaid(),
          }))} />
        {p.status === "rejected" && !nextStatus && p.notes && (
          <p className="mt-2 text-[12.5px] text-st-rejected bg-st-rejected-bg rounded-xl px-3 py-2">{p.notes}</p>
        )}
        {nextStatus === "rejected" && <div className="mt-3"><RejectBox busy={busy} onCancel={() => setNextStatus(null)} onReject={(why) => run(() => actions.reject(p, why), "Rejected, seller notified")} /></div>}
        {(nextStatus === "sold" || nextStatus === "paid") && (
          <div className="mt-3 rounded-2xl bg-st-sold-bg p-3.5 space-y-2">
            <label htmlFor="sale-price" className="text-[12px] font-bold text-st-sold">Sale price, what the buyer paid (IQD)</label>
            <AmountInput id="sale-price" value={salePrice} onChange={setSalePrice} />
            {isOwnStock && (
              <>
                <label htmlFor="own-profit" className="block pt-1 text-[12px] font-bold text-st-paid">Our profit on this sale (IQD)</label>
                <AmountInput id="own-profit" value={ownProfit} onChange={setOwnProfit} />
                <p className="text-[11.5px] text-adm-soft">Our own stock: this profit shows in fees owed while it's sold, and counts in total earned once you mark it paid.</p>
              </>
            )}
            <p className="text-[11.5px] text-adm-soft">
              {discount.original !== null ? `Discount running: ${discount.percent}% off ${fmtIQD(discount.original)}. ` : `Listed at ${fmtIQD(p.price)}. `}
              {isOwnStock ? "The sale is recorded on this price." : "The sale and the service fee are recorded on this price."}
              {actions.isStocked(p) ? ` Records one unit; stock goes from ${p.stock} to ${p.stock - 1} and the product stays live.` : ""}
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={!salePrice || (isOwnStock && !ownProfit) || busy} className={`${btn("dark")} flex-1`}
                onClick={() => {
                  const own = isOwnStock ? ownProfit : undefined;
                  run(() => (nextStatus === "sold" ? actions.markSold(p, salePrice, own) : actions.markPaid(p, salePrice, own)), nextStatus === "sold" ? "Marked sold" : "Marked paid");
                }}>
                {nextStatus === "sold" ? m.adminMarkSold() : m.adminMarkPaid()}
              </button>
              <button type="button" className={`${btn("outline")} flex-1`} onClick={() => setNextStatus(null)}>{m.adminCancel()}</button>
            </div>
          </div>
        )}
        {(nextStatus === "approved" || nextStatus === "pending") && (
          <div className="mt-3">
            <ConfirmBox tone="neutral" busy={busy}
              title={nextStatus === "approved" ? (p.soldFromId && soldish ? "Buyer cancelled?" : "Make it live?") : "Move back to pending?"}
              text={nextStatus === "approved"
                ? (p.soldFromId && soldish ? "This unit goes back into the product's stock (+1) and this entry is removed." : "It shows on the site and the seller is notified.")
                : "It is hidden from the site until approved again."}
              confirmLabel={nextStatus === "approved" ? m.adminApprove() : "Move to pending"}
              onCancel={() => setNextStatus(null)}
              onConfirm={() => run(() => (nextStatus === "approved" ? actions.makeLive(p) : actions.setPending(p)), nextStatus === "approved" ? "Live, seller notified" : "Moved to pending")} />
          </div>
        )}
      </section>

      {/* Photos */}
      <section>
        <SectionTitle>
          Photos · {p.photos?.length ?? 0}/{MAX_PHOTOS}
          {p.storyCrop?.url === p.photos?.[main] && (
            <span className="ms-2 align-[1px] text-[10.5px] font-bold normal-case tracking-normal text-adm-accent bg-adm-accent-soft rounded-full px-2 py-0.5">Story crop set</span>
          )}
        </SectionTitle>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {(p.photos ?? []).map((url, i) => (
            <PhotoTile key={url + i} product={p} url={url} index={i} isMain={i === main} onlyOne={p.photos.length === 1} actions={actions} toast={toast} />
          ))}
          <AddPhotoTile product={p} actions={actions} toast={toast} />
        </div>
        <p className="text-[11.5px] text-adm-fade mt-1.5">Rotate turns the preview first; ✓ saves it once. The star makes a photo the main one; the red crop button on the main photo sets how it sits in the Instagram story. Add photo uploads your own shots, up to {MAX_PHOTOS}.</p>
      </section>

      {/* Money */}
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{soldish ? "Sold for" : "Price"}</p>
          <p className="text-[15px] font-bold tabular-nums" dir="ltr">{fmtIQD(shownPrice(p))}</p>
        </div>
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{isOwnStock ? "Our profit" : m.adminProfitLabel()}</p>
          <p className="text-[15px] font-bold tabular-nums text-adm-accent" dir="ltr">{fmtIQD(p.profit)}</p>
        </div>
        <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
          <p className="text-[11px] text-adm-fade font-semibold">{p.stock > 1 ? "In stock" : soldish ? "Sold on" : "Posted"}</p>
          <p className="text-[13px] font-bold truncate">{p.stock > 1 ? p.stock : day(soldish ? p.dateSold : p.dateAdded)}</p>
        </div>
      </section>

      {/* Details */}
      <section className="space-y-3">
        <SectionTitle>Details</SectionTitle>
        <div>
          <label htmlFor="d-title" className={labelCls}>{m.fieldTitle()}</label>
          <input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>{m.fieldCategory()}</p>
            <CustomSelect inline listClassName="max-h-56" value={category}
              onChange={(next) => { setCategory(next); setBrand((b) => (brandFitsCategory(b, next) ? b : "")); }}
              options={CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value }))} />
          </div>
          <div>
            <p className={labelCls}>{m.fieldBrand()}</p>
            <CustomSelect inline listClassName="max-h-56" value={brand} onChange={setBrand} placeholder="None"
              options={[{ value: "", label: "None" }, ...getBrandChoices(category, brand, brandCounts).map((b) => ({ value: b, label: b }))]} />
          </div>
        </div>
        <div>
          <p className={labelCls}>{m.fieldCondition()}</p>
          <Segmented size="sm" value={condition} onChange={(v) => !p.storeId && setCondition(v)}
            options={CONDITIONS.map((c) => ({ value: c.value, label: c.label() }))} />
          {p.storeId && <p className="text-[11.5px] text-adm-fade mt-1">Store products are always new.</p>}
        </div>
        <div>
          <label htmlFor="d-price" className={labelCls}>{soldish ? "Sale price (IQD)" : `${m.fieldPrice()} (IQD)`}</label>
          <AmountInput id="d-price" value={price} onChange={setPrice} />
          <p className="text-[11.5px] text-adm-fade mt-1">
            {price && price !== shownPrice(p)
              ? `Was ${fmtIQD(shownPrice(p))}. The service fee is worked out again on save, and the seller is notified.`
              : soldish ? "What the buyer paid. The service fee follows this price." : "Change it when the seller agreed a lower price. The service fee follows it."}
          </p>
        </div>
        <div>
          <label htmlFor="d-desc" className={labelCls}>{m.fieldDescription()}</label>
          <textarea id="d-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} h-auto py-2.5 resize-none`} />
        </div>
      </section>

      {/* Seller */}
      <section>
        <SectionTitle>Seller</SectionTitle>
        <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={p.sellerName} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate">{p.sellerName}{p.storeName ? <span className="text-adm-fade font-normal"> · {p.storeName}</span> : null}</p>
              <p className="text-[12.5px] text-adm-soft tabular-nums" dir="ltr">{p.sellerPhone}</p>
              {(p.city || p.sellerAddress) && <p className="text-[12px] text-adm-fade truncate">{p.city}{p.sellerAddress ? `, ${p.sellerAddress}` : ""}</p>}
            </div>
          </div>
          {p.sellerPhone && (
            <div className="grid grid-cols-2 gap-2">
              <a href={waLink(p.sellerPhone)} target="_blank" rel="noopener noreferrer" className={btn("wa")}><IconWhatsApp className="w-4 h-4" /> WhatsApp</a>
              <button type="button" onClick={() => copy(`${m.adminContact()} ${ltrPhone(p.sellerPhone)}`, "Number copied")} className={btn("outline")}><IconCopy className="w-4 h-4" /> {m.copyNumber()}</button>
              {p.status === "approved" && (
                <a href={waLink(p.sellerPhone, approvalMessage(p))} target="_blank" rel="noopener noreferrer" className={`${btn("wa")} col-span-2`}>
                  <IconWhatsApp className="w-4 h-4" /> Send approval message
                </a>
              )}
            </div>
          )}
          <Link to="/admin/products" search={{ tab: "all", sellerId: p.sellerId }} onClick={onClose} className="block text-[12.5px] font-semibold text-adm-accent">
            All products from this seller →
          </Link>
        </div>
      </section>

      <SponsorBox product={p} actions={actions} toast={toast} />

      {/* History */}
      <section>
        <SectionTitle>History</SectionTitle>
        <ol className="space-y-2.5">
          {history.map((l) => (
            <li key={l._id} className="grid grid-cols-[10px_1fr] gap-2.5 text-[12.5px]">
              <span className="w-2 h-2 rounded-full bg-adm-line mt-1.5" />
              <div className="min-w-0">
                <span className="font-semibold">{actionLabel(l.action)}</span>
                <span className="text-adm-fade"> · {l.adminName || l.sellerName || ""} · {timeAgo(l.createdAt)}</span>
                {l.notes && <p className="text-adm-soft truncate">{l.notes}</p>}
              </div>
            </li>
          ))}
          <li className="grid grid-cols-[10px_1fr] gap-2.5 text-[12.5px]">
            <span className="w-2 h-2 rounded-full bg-adm-accent mt-1.5" />
            <div><span className="font-semibold">Posted</span><span className="text-adm-fade"> · {p.sellerName} · {day(p.dateAdded)}</span></div>
          </li>
        </ol>
      </section>
    </Panel>
  );
}
