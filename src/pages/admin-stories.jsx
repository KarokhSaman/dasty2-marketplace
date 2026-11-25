import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { priceInfo } from "@/convex/discount";
import { buildStoryImage, shareStoryFiles, storyConditionLabel } from "@/lib/storyImage";
import { buildSpotlightImage } from "@/lib/spotlightImage";
import { getCityLabel } from "@/lib/cities";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { formatAmount } from "@/components/ui";
import {
  PageHeader, Card, Empty, Skeleton, Segmented, FilterChips, Code, Thumb, btn, fmtIQD, useToast, useCopy, IconCheck, IconCopy, IconStar,
} from "@/components/admin/ui";

// Icons for the three make buttons
const IconStory = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10 6.5h4" />
  </svg>
);
const IconReel = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 8.5h18M8 3l2.5 5.5M14 3l2.5 5.5" /><path d="m10.5 12.5 4 2.5-4 2.5z" fill="currentColor" />
  </svg>
);

// One of the three equal make buttons: icon and name, or its progress while making.
function MakeButton({ icon: Icon, label, busy, progress, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 h-11 w-full min-w-0 px-2 rounded-xl border border-adm-line bg-adm-surface text-adm-ink text-[13.5px] font-semibold whitespace-nowrap transition-colors hover:border-adm-fade active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none">
      {busy ? (
        <span className="w-4 h-4 shrink-0 border-2 border-adm-accent/30 border-t-adm-accent rounded-full animate-spin" />
      ) : (
        <Icon className="w-[18px] h-[18px] shrink-0 text-adm-accent" />
      )}
      <span className="truncate tabular-nums">{busy ? progress : label}</span>
    </button>
  );
}

// Instagram only shows in the phone's share sheet for up to 8 photos at once.
const MAX = 8;
// A reel shows each product for about 2 seconds, so 5 keep it near 15 seconds.
const REEL_MAX = 5;
const DAY = 86400000;
// The stories are for the Kurdish audience, whatever language the admin page is in.
const KU = { locale: "ckb" };

const LISTS = [
  { value: "today", label: "Approved today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All live" },
];
const PRICE = [
  { value: "none", label: "Without price" },
  { value: "price", label: "With price" },
];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const approvedTime = (p) => new Date(p.approvedAt ?? p.dateAdded ?? 0).getTime();
const mainPhoto = (p) => p.photos?.[p.mainPhotoIndex ?? 0] ?? p.photos?.[0];

// The product's page in Kurdish, for the Instagram link sticker.
const productLink = (p) => `${window.location.origin}${localizeHref(`/products/${p._id}`, KU)}`;

function storyFor(p, noPrice) {
  return {
    title: p.title,
    price: `${formatAmount(priceInfo(p).price)} IQD`,
    noPrice,
    photo: mainPhoto(p),
    storyCrop: p.storyCrop,
    city: p.city ? getCityLabel(p.city, "ckb") : undefined,
    store: p.storeId ? m.storyStoreLabel({}, KU) : undefined,
    condition: storyConditionLabel(p, !!p.storeId, "ckb"),
    code: p.seq ? `#${p.seq}` : undefined,
    site: "mndallan.com",
    rtl: true,
    brand: p.brand,
  };
}

// The reel's Kurdish lines. The end card counts the live products in round
// hundreds ("more than 200"), or fifties below 100.
const roundedCount = (liveCount) => {
  const step = liveCount >= 100 ? 100 : 50;
  return Math.max(step, Math.floor(liveCount / step) * step).toLocaleString("ar-EG");
};

function reelText(liveCount) {
  const count = roundedCount(liveCount);
  return {
    headline: m.reelHeadline({}, KU),
    headline2: m.reelHeadline2({}, KU),
    sub: m.reelSub({}, KU),
    endLine: m.reelEndLine({ count }, KU),
  };
}

const NUMBERS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
const WHATSAPP_PHONE = "07509717177";

// The reel's Instagram caption, in Kurdish: a short first line (all that
// shows before "more"), one line per product with its code so buyers can
// send it on WhatsApp, how to buy, "link in bio", and 5 hashtags (the most
// Instagram allows): the brand, baby items, and the products' cities.
// Codes have no "#", or Instagram counts them as hashtags too. Every line
// starts with a right-to-left mark so it reads right to left even when it
// begins with a number or a Latin word.
const RLM = "\u200F";
// Left-to-right bits (prices, codes, the phone, Latin hashtags) are wrapped
// in an LTR isolate so the right-to-left line doesn't flip them
// ("IQD 100,000", "0316-26"); codes use a non-breaking hyphen.
const ltr = (text) => `\u2066${text}\u2069`;
function reelCaption(chosen, liveCount) {
  const lines = chosen.map((p, i) => [
    `${NUMBERS[i]} ${p.title}`,
    ltr(`${formatAmount(priceInfo(p).price)} IQD`),
    p.city ? getCityLabel(p.city, "ckb") : null,
    p.seq ? `${m.reelCaptionCode({}, KU)} ${ltr(p.seq.replace("-", "\u2011"))}` : null,
  ].filter(Boolean).join(" · "));
  const cities = [...new Set(chosen.map((p) => p.city && getCityLabel(p.city, "ckb")).filter(Boolean))]
    .map((c) => `#${c.replace(/\s+/g, "_")}`);
  const tags = ["#منداڵان", "#کاڵای_منداڵ", ...cities.slice(0, 2), "#کوردستان", "#mndallan"];
  // keep 5: drop "Kurdistan" when two cities are there
  const five = tags.length > 5 ? tags.filter((t) => t !== "#کوردستان") : tags;
  return [
    m.reelCaptionTitle({}, KU),
    "",
    ...lines,
    "",
    m.reelCaptionBuy({ phone: ltr(WHATSAPP_PHONE) }, KU),
    m.reelCaptionBio({}, KU),
    m.reelCaptionMore({ count: roundedCount(liveCount) }, KU),
    "",
    five.slice(0, 5).map((t) => (/^#[A-Za-z]/.test(t) ? ltr(t) : t)).join(" "),
  ].map((line) => (line ? RLM + line : line)).join("\n");
}

function PickRow({ product: p, picked, disabled, onToggle }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled} aria-pressed={picked}
      className={`w-full flex items-center gap-3 rounded-2xl border bg-adm-surface p-2.5 mb-2 text-start disabled:opacity-45 ${
        picked ? "border-adm-accent" : "border-adm-line"}`}>
      <span className={`w-6 h-6 rounded-lg border-2 grid place-items-center shrink-0 ${
        picked ? "bg-adm-accent border-adm-accent text-white" : "border-adm-line"}`}>
        {picked && <IconCheck className="w-3.5 h-3.5" />}
      </span>
      <Thumb src={mainPhoto(p)} size={48} />
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-semibold truncate" dir="auto">{p.title}</span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-adm-soft">
          <Code>{p.seq}</Code> <span dir="ltr" className="tabular-nums">{fmtIQD(priceInfo(p).price)} IQD</span>
          {p.storyCrop?.url === mainPhoto(p) && <span className="text-adm-fade">· crop set</span>}
        </span>
      </span>
    </button>
  );
}

function StoryCard({ story, onCopy, copied }) {
  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface p-1.5">
      <img src={story.url} alt={`Story ${story.product.seq ?? ""}`} className="w-full aspect-[9/16] rounded-xl object-cover bg-adm-sunk" />
      <button type="button" onClick={onCopy} className={`${btn(copied ? "approve" : "outline", "sm")} w-full mt-1.5`}>
        {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />} {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

// Instagram stories for several live products at once: pick them, make all
// the images on the phone, save them together, and copy each product's link
// for its link sticker.
export default function AdminStoriesPage() {
  const products = useQuery(api.products.getAll);
  const toast = useToast();
  const copy = useCopy();
  const [list, setList] = useState("today");
  const [price, setPrice] = useState("none");
  const [category, setCategory] = useState("");
  const [picked, setPicked] = useState(null);
  const [making, setMaking] = useState(null);
  const [stories, setStories] = useState(null);
  // a made reel: { video, cover } files and their preview URLs
  const [reel, setReel] = useState(null);
  const [reelMaking, setReelMaking] = useState(null);
  // Every story whose link was copied stays ticked, to keep track while posting.
  const [copiedIds, setCopiedIds] = useState([]);

  const live = useMemo(
    () => (products ?? []).filter((p) => p.status === "approved").sort((a, b) => approvedTime(b) - approvedTime(a)),
    [products],
  );
  const inList = useMemo(() => {
    if (list === "today") return live.filter((p) => approvedTime(p) >= startOfToday());
    if (list === "week") return live.filter((p) => approvedTime(p) >= Date.now() - 7 * DAY);
    return live;
  }, [live, list]);
  // Only the categories that have products in this list, with how many.
  const categories = useMemo(() => {
    const count = (v) => inList.filter((p) => p.category === v).length;
    const found = CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value, count: count(c.value) })).filter((c) => c.count);
    return [{ value: "", label: "All", count: inList.length }, ...found];
  }, [inList]);
  // a category with nothing in the chosen list falls back to All
  const cat = categories.some((c) => c.value === category) ? category : "";
  const shown = useMemo(() => (cat ? inList.filter((p) => p.category === cat) : inList), [inList, cat]);

  // Tick today's approvals for a start, once the products arrive.
  useEffect(() => {
    if (picked || !products) return;
    setPicked(live.filter((p) => approvedTime(p) >= startOfToday()).slice(0, MAX).map((p) => p._id));
  }, [products, live, picked]);

  // Let the made images go when they are replaced or the page closes.
  useEffect(() => () => stories?.forEach((s) => URL.revokeObjectURL(s.url)), [stories]);
  useEffect(() => () => { if (reel) { URL.revokeObjectURL(reel.videoUrl); URL.revokeObjectURL(reel.coverUrl); } }, [reel]);

  // Where the list was scrolled to when the stories or reel opened, so Back
  // returns to the same spot instead of the top.
  const listScroll = useRef(null);
  const showing = !!(stories || reel);
  useLayoutEffect(() => {
    if (showing) window.scrollTo(0, 0);
    else if (listScroll.current != null) { window.scrollTo(0, listScroll.current); listScroll.current = null; }
  }, [showing]);
  const rememberList = () => { if (!showing) listScroll.current = window.scrollY; };

  const ids = picked ?? [];
  const full = ids.length >= MAX;
  const toggle = (id) => setPicked(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  // Tick the shown products, as many as still fit under the limit.
  const tickShown = () => setPicked([...ids, ...shown.map((p) => p._id).filter((id) => !ids.includes(id))].slice(0, MAX));
  const allShownPicked = shown.length > 0 && shown.every((p) => ids.includes(p._id));

  // Stories (each in the next colour, so a run doesn't look the same) or
  // Spotlights (no price, a white bar for the link) of the ticked products.
  async function make(kind) {
    const chosen = ids.map((id) => live.find((p) => p._id === id)).filter(Boolean);
    if (!chosen.length) return;
    const made = [];
    const spotlight = kind === "spotlight";
    try {
      for (const [i, p] of chosen.entries()) {
        setMaking({ kind, done: i, total: chosen.length });
        const blob = spotlight
          ? await buildSpotlightImage({ category: p.category, photo: mainPhoto(p), storyCrop: p.storyCrop, code: p.seq ? `#${p.seq}` : undefined })
          : await buildStoryImage({ ...storyFor(p, price === "none"), theme: i });
        if (!blob) continue;
        const file = new File([blob], `${p.seq || p._id}${spotlight ? "-spotlight" : price === "none" ? "-link" : ""}.png`, { type: "image/png" });
        made.push({ product: p, file, url: URL.createObjectURL(file), spotlight });
      }
    } finally {
      setMaking(null);
    }
    if (made.length < chosen.length) toast(`${chosen.length - made.length} could not be made`, "error");
    if (made.length) { rememberList(); setCopiedIds([]); setStories(made); }
  }

  // One reel (MP4, no sound) of the ticked products, with prices, plus a cover
  // image. Made in the browser; the drawing code is loaded only when needed.
  async function makeReel() {
    const chosen = ids.map((id) => live.find((p) => p._id === id)).filter(Boolean).slice(0, REEL_MAX);
    if (!chosen.length) return;
    setReelMaking(0);
    try {
      const { canMakeReel, buildReelVideo, buildReelCover } = await import("@/lib/reelVideo");
      if (!(await canMakeReel())) {
        toast("This browser can't make videos. Try Chrome on a computer or Android.", "error");
        return;
      }
      const list = chosen.map((p) => storyFor(p, false));
      const text = reelText(live.length);
      const cover = await buildReelCover(list, text);
      const video = await buildReelVideo(list, text, (x) => setReelMaking(x));
      const day = new Date().toISOString().slice(0, 10);
      const videoFile = new File([video], `mndallan-reel-${day}.mp4`, { type: "video/mp4" });
      const coverFile = new File([cover], `mndallan-reel-${day}-cover.png`, { type: "image/png" });
      rememberList();
      setReel({ video: videoFile, cover: coverFile, videoUrl: URL.createObjectURL(videoFile), coverUrl: URL.createObjectURL(coverFile), count: chosen.length, caption: reelCaption(chosen, live.length) });
    } catch (err) {
      console.error(err);
      toast("Could not make the reel", "error");
    } finally {
      setReelMaking(null);
    }
  }

  async function saveFile(file, what) {
    const result = await shareStoryFiles([file]);
    if (result === "downloaded") toast(`${what} downloaded`);
    else if (result === "failed") toast(`Could not save the ${what.toLowerCase()}`, "error");
  }

  async function saveAll() {
    const result = await shareStoryFiles(stories.map((s) => s.file));
    if (result === "downloaded") toast(`${stories.length} downloaded`);
    else if (result === "failed") toast("Could not save the stories", "error");
  }

  async function copyLink(p) {
    await copy(productLink(p), `Link for #${p.seq} copied`);
    setCopiedIds((ids) => (ids.includes(p._id) ? ids : [...ids, p._id]));
  }

  if (!products) return <Skeleton rows={5} />;

  if (reel) {
    return (
      <div className="max-w-[760px]">
        <PageHeader title="Reel ready" sub={`${reel.count} ${reel.count === 1 ? "product" : "products"} · about ${Math.round((57 + reel.count * 57 + 120) / 30)} seconds · no sound`}
          actions={<button type="button" onClick={() => setReel(null)} className={btn("ghost")}>Back</button>} />
        <p className="rounded-2xl bg-adm-sunk px-3.5 py-3 text-[12.5px] text-adm-soft leading-relaxed mb-3">
          1. Save the reel and the cover. 2. In Instagram, make a new reel from the video and add a trending sound.
          3. Tap <b>Edit cover</b> → <b>Add from camera roll</b> and pick the cover. 4. Tap <b>Copy caption</b> and paste it.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div className="rounded-2xl border border-adm-line bg-adm-surface p-1.5">
            <video src={reel.videoUrl} controls muted playsInline loop autoPlay className="w-full aspect-[9/16] rounded-xl bg-adm-sunk" />
            <button type="button" onClick={() => saveFile(reel.video, "Reel")} className={`${btn("primary", "sm")} w-full mt-1.5`}>Save reel</button>
          </div>
          <div className="rounded-2xl border border-adm-line bg-adm-surface p-1.5">
            <img src={reel.coverUrl} alt="Reel cover" className="w-full aspect-[9/16] rounded-xl object-cover bg-adm-sunk" />
            <button type="button" onClick={() => saveFile(reel.cover, "Cover")} className={`${btn("outline", "sm")} w-full mt-1.5`}>Save cover</button>
          </div>
        </div>
        <div className="rounded-2xl border border-adm-line bg-adm-surface p-3 mb-24">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[13px] font-semibold">Caption</span>
            <button type="button" onClick={() => copy(reel.caption, "Caption copied")} className={btn("primary", "sm")}>
              <IconCopy className="w-3.5 h-3.5" /> Copy caption
            </button>
          </div>
          <p dir="rtl" lang="ckb" className="whitespace-pre-wrap text-start text-[13.5px] leading-relaxed text-adm-soft select-all">{reel.caption}</p>
        </div>
      </div>
    );
  }

  if (stories) {
    const spotlights = stories.every((s) => s.spotlight);
    return (
      <div className="max-w-[760px]">
        <PageHeader title={`${stories.length} ${spotlights ? (stories.length === 1 ? "Spotlight" : "Spotlights") : stories.length === 1 ? "story" : "stories"} ready`}
          sub={spotlights ? "No price · the white bar is for the link sticker" : price === "none" ? "Without price · the tag is left for the link sticker" : "With price"}
          actions={<button type="button" onClick={() => setStories(null)} className={btn("ghost")}>Back</button>} />
        <p className="rounded-2xl bg-adm-sunk px-3.5 py-3 text-[12.5px] text-adm-soft leading-relaxed mb-3">
          1. Save all to Photos. 2. In Instagram, add a story and pick them all from your gallery.
          3. On each one, tap <b>Copy link</b> here, add a link sticker and paste{spotlights ? ", then put the sticker on the white bar" : price === "none" ? ", then put the sticker on the empty tag" : ""}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-24">
          {stories.map((s) => (
            <StoryCard key={s.product._id} story={s} copied={copiedIds.includes(s.product._id)} onCopy={() => copyLink(s.product)} />
          ))}
        </div>
        <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom,0px))] lg:bottom-0 lg:start-[232px] z-20 bg-adm-bg/95 backdrop-blur border-t border-adm-line px-4 lg:px-8 py-3">
          <button type="button" onClick={saveAll} className={`${btn("primary", "lg")} w-full max-w-[760px]`}>
            Save all {stories.length} to Photos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px]">
      <PageHeader title="Stories" sub={`Pick up to ${MAX} live products, then make their stories or Spotlights at once, or one reel of up to ${REEL_MAX}`} />
      <Segmented options={PRICE} value={price} onChange={setPrice} className="mb-2" />
      <Segmented options={LISTS} value={list} onChange={setList} className="mb-2.5" size="sm" />
      {categories.length > 2 && <div className="mb-2.5"><FilterChips options={categories} value={cat} onChange={setCategory} /></div>}
      {shown.length > 1 && !allShownPicked && !full && (
        <div className="flex justify-end mb-1.5">
          <button type="button" onClick={tickShown} className={btn("ghost", "sm")}>
            Tick {Math.min(shown.filter((p) => !ids.includes(p._id)).length, MAX - ids.length)} more{cat ? ` ${cat}` : ""}
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <Card><Empty>{cat ? `No live ${cat} products here.` : list === "today" ? "Nothing approved today yet. Try This week." : "No live products here."}</Empty></Card>
      ) : (
        <div className="mb-32">
          {shown.map((p) => (
            <PickRow key={p._id} product={p} picked={ids.includes(p._id)} disabled={full && !ids.includes(p._id)} onToggle={() => toggle(p._id)} />
          ))}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom,0px))] lg:bottom-0 lg:start-[232px] z-20 bg-adm-bg/95 backdrop-blur border-t border-adm-line px-4 lg:px-8 pt-2 pb-3">
        <div className="max-w-[760px]">
          <div className="flex items-center justify-between h-6 mb-1.5 text-[12.5px]">
            <span className={ids.length ? "font-semibold" : "text-adm-fade"}>
              {ids.length ? `${ids.length} of ${MAX} picked` : "Tick products to start"}
            </span>
            {ids.length > 0 && (
              <button type="button" onClick={() => setPicked([])} className="font-semibold text-adm-soft hover:text-adm-ink px-1">Clear</button>
            )}
          </div>
          {/* three equal buttons: what each makes, in the same shape */}
          <div className="grid grid-cols-3 gap-2">
            <MakeButton icon={IconStory} label="Stories" onClick={() => make("story")}
              busy={making?.kind === "story"} progress={making ? `${making.done + 1} of ${making.total}` : ""}
              disabled={!ids.length || !!making || reelMaking != null} />
            <MakeButton icon={IconStar} label="Spotlight" onClick={() => make("spotlight")}
              busy={making?.kind === "spotlight"} progress={making ? `${making.done + 1} of ${making.total}` : ""}
              disabled={!ids.length || !!making || reelMaking != null} />
            <MakeButton icon={IconReel} label={ids.length > REEL_MAX ? `Reel ≤ ${REEL_MAX}` : "Reel"} onClick={makeReel}
              busy={reelMaking != null} progress={reelMaking != null ? `${Math.round(reelMaking * 100)}%` : ""}
              disabled={!ids.length || ids.length > REEL_MAX || !!making || reelMaking != null} />
          </div>
        </div>
      </div>
    </div>
  );
}
