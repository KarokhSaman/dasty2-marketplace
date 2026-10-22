import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { rotatePhoto } from "@/lib/rotateImage";
import { useImageUpload } from "@/lib/useImageUpload";
import * as m from "@/paraglide/messages";
import { errorMessage } from "@/lib/errors";
import { photoProps } from "@/lib/images";
import { useProductActions } from "@/components/admin/useProductActions";
import { RejectBox } from "@/components/admin/ProductPanel";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { brandFitsCategory, getBrandChoices } from "@/lib/brands";
import { StoreTag, Code, Segmented, btn, fmtIQD, inputCls, labelCls, useToast, IconX, IconCheck, IconRotate, IconStar, IconTrash } from "@/components/admin/ui";

const CONDITION = { new: () => m.conditionNew(), likenew: () => m.conditionLikeNew(), used: () => m.conditionUsed() };

// New products one at a time: big photos, the facts that matter, then Approve
// or Reject. On phones the photo can be swiped right (approve) or left (reject).
// Keys on a laptop: A approve, R reject, ← → photos, Esc close. The photo
// shown can be rotated, made the main one or deleted before deciding.
export default function ReviewMode({ queue, onClose }) {
  const actions = useProductActions();
  const toast = useToast();
  const [ids] = useState(() => queue.map((p) => p._id));
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState(() => queue[0]?.mainPhotoIndex ?? 0);
  const [turns, setTurns] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const upload = useImageUpload();
  const live = useQuery(api.products.getAll);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ approved: 0, rejected: 0 });
  const [mounted, setMounted] = useState(false);
  const swipe = useRef(null);
  const [dx, setDx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // { title, category, brand, condition, description }

  // Live copies, so photo edits show at once; the queue is the fallback.
  const byId = Object.fromEntries(queue.map((p) => [p._id, p]));
  for (const x of live ?? []) if (byId[x._id]) byId[x._id] = x;
  const p = byId[ids[index]];
  const total = ids.length;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Each product opens on its main photo, with its details not being edited.
  useEffect(() => { setPhoto(byId[ids[index]]?.mainPhotoIndex ?? 0); setTurns(0); setConfirmDel(false); setEditing(false); setDraft(null); }, [index]);

  // Detail fixes made during review. Saved with "Save" or together with Approve.
  const startEdit = () => {
    setDraft({ title: p.title, category: p.category, brand: p.brand ?? "", condition: p.storeId ? "new" : p.condition, description: p.description ?? "" });
    setEditing(true);
  };
  const dirty = !!draft && !!p && (
    draft.title.trim() !== p.title || draft.category !== p.category ||
    (draft.brand || "") !== (p.brand ?? "") || draft.condition !== (p.storeId ? "new" : p.condition) ||
    draft.description.trim() !== (p.description ?? "").trim());
  const liveBrands = useQuery(api.products.listBrands, draft?.category ? { category: draft.category } : "skip");
  const brandCounts = useMemo(() => Object.fromEntries((liveBrands ?? []).map((b) => [b.brand, b.count])), [liveBrands]);
  async function saveDraft() {
    if (!draft.title.trim()) throw new Error("Title is required");
    await actions.saveDetails(p, {
      title: draft.title.trim(), category: draft.category, brand: draft.brand || undefined,
      condition: draft.condition, description: draft.description.trim(), price: p.price,
    });
  }
  useEffect(() => { setTurns(0); setConfirmDel(false); }, [photo]);
  const count = p?.photos?.length ?? 0;
  useEffect(() => { if (count && photo > count - 1) setPhoto(count - 1); }, [count, photo]);

  function next() { setIndex((i) => i + 1); setRejecting(false); setDx(0); }

  async function photoAction(fn, done) {
    setPhotoBusy(true);
    try { await fn(); toast(done); }
    catch (err) { toast(errorMessage(err, "Could not change the photo"), "error"); }
    finally { setPhotoBusy(false); }
  }
  const saveRotation = () => photoAction(async () => {
    const url = p.photos[photo];
    const newUrl = await upload(await rotatePhoto(url, turns));
    await actions.swapPhoto(p, photo, url, newUrl, turns);
    setTurns(0);
  }, "Photo rotated");
  const makeMain = () => photoAction(() => actions.setMainPhoto(p, photo), "Main photo changed");
  const deletePhoto = () => photoAction(async () => { setConfirmDel(false); await actions.removePhoto(p, photo); }, "Photo deleted");

  async function decide(kind, reason) {
    if (!p || busy) return;
    setBusy(true);
    try {
      if (kind === "approve" && dirty) await saveDraft();
      if (kind === "approve") await actions.approve(p);
      else await actions.reject(p, reason);
      setDone((d) => ({ ...d, [kind === "approve" ? "approved" : "rejected"]: d[kind === "approve" ? "approved" : "rejected"] + 1 }));
      toast(kind === "approve" ? `${dirty ? "Saved and approved" : "Approved"} ${p.seq ?? ""}` : `Rejected ${p.seq ?? ""}`);
      next();
    } catch (err) {
      toast(errorMessage(err, "Something went wrong"), "error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (e.key === "Escape") onClose();
      else if (!p) return;
      else if (e.key === "a" || e.key === "A") decide("approve");
      else if (e.key === "r" || e.key === "R") setRejecting((v) => !v);
      else if (e.key === "ArrowRight") setPhoto((i) => Math.min(i + 1, (p.photos?.length ?? 1) - 1));
      else if (e.key === "ArrowLeft") setPhoto((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Swipe on the photo. Direction is physical: right = approve in every language.
  const onDown = (e) => { if (busy || turns || confirmDel || photoBusy || editing) return; swipe.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (swipe.current != null) setDx(e.clientX - swipe.current); };
  const onUp = () => {
    if (swipe.current == null) return;
    swipe.current = null;
    if (dx > 100) decide("approve");
    else if (dx < -100) { setRejecting(true); setDx(0); }
    else setDx(0);
  };

  if (!mounted) return null;

  const photos = p?.photos ?? [];
  const checks = p ? [
    [photos.length >= 2, photos.length >= 2 ? `${photos.length} photos` : "Only one photo"],
    [!!p.brand, p.brand ? `Brand: ${p.brand}` : "No brand chosen"],
    [(p.description ?? "").trim().length >= 15, (p.description ?? "").trim().length >= 15 ? "Has a description" : "Very short description"],
  ] : [];

  return createPortal(
    <div className="adm-scope fixed inset-0 z-[85] bg-adm-bg text-adm-ink flex flex-col" role="dialog" aria-modal="true" aria-label="Review new products">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-adm-line shrink-0" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
        <button type="button" onClick={onClose} aria-label="Close review" className="w-9 h-9 rounded-xl border border-adm-line bg-adm-surface grid place-items-center"><IconX className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold">Review new products</p>
          <p className="text-[11.5px] text-adm-fade tabular-nums">{Math.min(index + 1, total)} of {total}</p>
        </div>
        <div className="w-24 h-1.5 rounded-full bg-adm-line overflow-hidden">
          <div className="h-full bg-adm-accent transition-[width] duration-300" style={{ width: `${(index / Math.max(total, 1)) * 100}%` }} />
        </div>
      </div>

      {!p ? (
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div className="space-y-3 max-w-xs">
            <div className="mx-auto w-16 h-16 rounded-full bg-st-approved-bg text-st-approved grid place-items-center"><IconCheck className="w-8 h-8" /></div>
            <p className="text-[19px] font-bold">All caught up</p>
            <p className="text-[13.5px] text-adm-soft">{done.approved} approved · {done.rejected} rejected. Sellers have been notified.</p>
            <button type="button" onClick={onClose} className={`${btn("dark", "lg")} w-full`}>Done</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="max-w-5xl mx-auto p-4 lg:p-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-adm-sunk select-none touch-pan-y"
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                  style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 30}deg)` : undefined, transition: swipe.current == null ? "transform 180ms ease" : "none" }}>
                  {photos[photo] && <img {...photoProps(photos[photo], 900)} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none transition-transform duration-200" style={turns ? { transform: `rotate(${turns * 90}deg)` } : undefined} />}
                  {photo === (p.mainPhotoIndex ?? 0) && <span className="absolute top-3 end-3 text-[11px] font-bold bg-adm-accent text-white rounded-full px-2.5 py-0.5">Main</span>}
                  {photoBusy && <div className="absolute inset-0 grid place-items-center bg-black/35"><span className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
                  <span className="absolute top-4 start-4 px-3 py-1 rounded-lg border-[3px] border-st-approved text-st-approved bg-adm-surface/80 font-black tracking-widest text-[16px] -rotate-12" style={{ opacity: Math.max(0, Math.min(1, dx / 100)) }}>APPROVE</span>
                  <span className="absolute top-4 end-4 px-3 py-1 rounded-lg border-[3px] border-st-rejected text-st-rejected bg-adm-surface/80 font-black tracking-widest text-[16px] rotate-12" style={{ opacity: Math.max(0, Math.min(1, -dx / 100)) }}>REJECT</span>
                  {photos.length > 1 && (
                    <span className="absolute bottom-3 end-3 text-[11px] font-bold bg-black/55 text-white rounded-full px-2 py-0.5 tabular-nums">{photo + 1}/{photos.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  {confirmDel ? (
                    <>
                      <span className="flex-1 text-[13px] font-semibold">Delete this photo?</span>
                      <button type="button" disabled={photoBusy} onClick={deletePhoto} className={btn("primary", "sm")}><IconTrash className="w-4 h-4" /> Delete</button>
                      <button type="button" onClick={() => setConfirmDel(false)} className={btn("outline", "sm")}>{m.adminCancel()}</button>
                    </>
                  ) : turns ? (
                    <>
                      <button type="button" onClick={() => setTurns((t) => (t + 1) % 4)} className={btn("outline", "sm")}><IconRotate className="w-4 h-4" /> Again</button>
                      <button type="button" disabled={photoBusy} onClick={saveRotation} className={btn("dark", "sm")}><IconCheck className="w-4 h-4" /> Save rotation</button>
                      <button type="button" onClick={() => setTurns(0)} className={btn("ghost", "sm")}>{m.adminCancel()}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" disabled={photoBusy} onClick={() => setTurns(1)} className={btn("outline", "sm")}><IconRotate className="w-4 h-4" /> Rotate</button>
                      {photo !== (p.mainPhotoIndex ?? 0) && (
                        <button type="button" disabled={photoBusy} onClick={makeMain} className={btn("outline", "sm")}><IconStar className="w-4 h-4" /> Make main</button>
                      )}
                      {photos.length > 1 && (
                        <button type="button" disabled={photoBusy} onClick={() => setConfirmDel(true)} className={`${btn("ghost", "sm")} ms-auto text-st-rejected`} aria-label="Delete photo"><IconTrash className="w-4 h-4" /></button>
                      )}
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
                    {photos.map((u, i) => (
                      <button key={u + i} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}
                        className={`relative w-14 h-14 shrink-0 rounded-xl overflow-hidden ring-2 ${i === photo ? "ring-adm-accent" : "ring-transparent"}`}>
                        <img {...photoProps(u, 120)} alt="" className="w-full h-full object-cover" />
                        {i === (p.mainPhotoIndex ?? 0) && <span className="absolute inset-x-0 bottom-0 bg-adm-accent text-white text-[9px] font-bold text-center leading-4">Main</span>}
                      </button>
                    ))}
                  </div>
                )}
                <p className="lg:hidden text-center text-[11.5px] text-adm-fade mt-2">Swipe the photo right to approve, left to reject</p>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-adm-fade">
                  {p.seq && <Code>{p.seq}</Code>}
                  {p.storeId && <StoreTag />}
                  <span>{new Date(p.dateAdded).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {!editing && (
                  <div className="flex items-start gap-2">
                    <h2 className="flex-1 min-w-0 text-[21px] font-bold leading-tight tracking-[-0.01em]">{p.title}</h2>
                    <button type="button" onClick={startEdit} className={`${btn("outline", "sm")} shrink-0`}>Edit details</button>
                  </div>
                )}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-[24px] font-bold text-adm-accent tabular-nums" dir="ltr">{fmtIQD(p.price)} IQD</span>
                  <span className="text-[13px] text-adm-soft">{m.adminProfitLabel()} {fmtIQD(p.profit)}</span>
                </div>
                {editing && draft && (
                  <div className="rounded-2xl border border-adm-line bg-adm-surface p-3.5 space-y-3">
                    <div>
                      <label htmlFor="rv-title" className={labelCls}>{m.fieldTitle()}</label>
                      <input id="rv-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className={labelCls}>{m.fieldCategory()}</p>
                        <CustomSelect inline listClassName="max-h-56" value={draft.category}
                          onChange={(c) => setDraft((d) => ({ ...d, category: c, brand: brandFitsCategory(d.brand, c) ? d.brand : "" }))}
                          options={CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value }))} />
                      </div>
                      <div>
                        <p className={labelCls}>{m.fieldBrand()}</p>
                        <CustomSelect inline listClassName="max-h-56" value={draft.brand} placeholder="None"
                          onChange={(b) => setDraft((d) => ({ ...d, brand: b }))}
                          options={[{ value: "", label: "None" }, ...getBrandChoices(draft.category, draft.brand, brandCounts).map((b) => ({ value: b, label: b }))]} />
                      </div>
                    </div>
                    <div>
                      <p className={labelCls}>{m.fieldCondition()}</p>
                      <Segmented size="sm" value={draft.condition} onChange={(v) => !p.storeId && setDraft((d) => ({ ...d, condition: v }))}
                        options={Object.entries(CONDITION).map(([value, label]) => ({ value, label: label() }))} />
                      {p.storeId && <p className="text-[11.5px] text-adm-fade mt-1">Store products are always new.</p>}
                    </div>
                    <div>
                      <label htmlFor="rv-desc" className={labelCls}>{m.fieldDescription()}</label>
                      <textarea id="rv-desc" rows={4} dir="auto" value={draft.description}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        className={`${inputCls} h-auto py-2.5 resize-y`} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={!dirty || busy}
                        onClick={async () => { setBusy(true); try { await saveDraft(); toast("Changes saved"); setEditing(false); setDraft(null); } catch (err) { toast(errorMessage(err, "Could not save"), "error"); } finally { setBusy(false); } }}
                        className={`${btn("dark", "sm")} flex-1`}>Save</button>
                      <button type="button" onClick={() => { setEditing(false); setDraft(null); }} className={`${btn("outline", "sm")} flex-1`}>{m.adminCancel()}</button>
                    </div>
                    {dirty && <p className="text-[11.5px] text-adm-fade">Approve also saves these changes.</p>}
                  </div>
                )}
                {!editing && <div className="grid grid-cols-2 gap-2">
                  {[["Category", p.category], ["Brand", p.brand || "—"], ["Condition", CONDITION[p.condition]?.() ?? p.condition], ["City", p.city || "—"]].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-adm-line bg-adm-surface px-3 py-2">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-adm-fade">{k}</p>
                      <p className="text-[13.5px] font-semibold truncate">{v}</p>
                    </div>
                  ))}
                </div>}
                <div className="rounded-xl border border-adm-line bg-adm-surface px-3 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold truncate">{p.sellerName}</p>
                    <p className="text-[12px] text-adm-soft tabular-nums" dir="ltr">{p.sellerPhone}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {checks.map(([ok, text]) => (
                    <p key={text} className="flex items-center gap-2 text-[12.5px]">
                      <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${ok ? "bg-st-approved-bg text-st-approved" : "bg-st-pending-bg text-st-pending"}`}>{ok ? "✓" : "!"}</span>
                      <span className="text-adm-soft">{text}</span>
                    </p>
                  ))}
                </div>
                {!editing && p.description && <p className="text-[13.5px] text-adm-soft leading-relaxed whitespace-pre-line">{p.description}</p>}
                {rejecting && <RejectBox busy={busy} onCancel={() => setRejecting(false)} onReject={(why) => decide("reject", why)} />}
              </div>
            </div>
          </div>

          {!rejecting && (
            <div className="shrink-0 border-t border-adm-line bg-adm-bg px-4 pt-3 grid grid-cols-2 gap-3 max-w-5xl w-full mx-auto"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${btn("danger", "lg")}`}>
                {m.adminReject()} <kbd className="max-lg:hidden text-[10px] border border-current rounded px-1 opacity-60">R</kbd>
              </button>
              <button type="button" disabled={busy} onClick={() => decide("approve")} className={`${btn("approve", "lg")}`}>
                {dirty ? "Save & approve" : m.adminApprove()} <kbd className="max-lg:hidden text-[10px] border border-current rounded px-1 opacity-60">A</kbd>
              </button>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
