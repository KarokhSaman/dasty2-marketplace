import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { priceInfo } from "@/convex/discount";
import { buildStoryImage, shareStoryFiles, storyConditionLabel } from "@/lib/storyImage";
import { getCityLabel } from "@/lib/cities";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { formatAmount } from "@/components/ui";
import {
  PageHeader, Card, Empty, Skeleton, Segmented, FilterChips, Code, Thumb, btn, fmtIQD, useToast, useCopy, IconCheck, IconCopy,
} from "@/components/admin/ui";

// Instagram only shows in the phone's share sheet for up to 8 photos at once.
const MAX = 8;
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

  const ids = picked ?? [];
  const full = ids.length >= MAX;
  const toggle = (id) => setPicked(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  // Tick the shown products, as many as still fit under the limit.
  const tickShown = () => setPicked([...ids, ...shown.map((p) => p._id).filter((id) => !ids.includes(id))].slice(0, MAX));
  const allShownPicked = shown.length > 0 && shown.every((p) => ids.includes(p._id));

  async function make() {
    const chosen = ids.map((id) => live.find((p) => p._id === id)).filter(Boolean);
    if (!chosen.length) return;
    const made = [];
    try {
      for (const [i, p] of chosen.entries()) {
        setMaking({ done: i, total: chosen.length });
        const blob = await buildStoryImage(storyFor(p, price === "none"));
        if (!blob) continue;
        const file = new File([blob], `${p.seq || p._id}${price === "none" ? "-link" : ""}.png`, { type: "image/png" });
        made.push({ product: p, file, url: URL.createObjectURL(file) });
      }
    } finally {
      setMaking(null);
    }
    if (made.length < chosen.length) toast(`${chosen.length - made.length} could not be made`, "error");
    if (made.length) { setCopiedIds([]); setStories(made); }
  }

  async function saveAll() {
    const result = await shareStoryFiles(stories.map((s) => s.file));
    if (result === "downloaded") toast(`${stories.length} stories downloaded`);
    else if (result === "failed") toast("Could not save the stories", "error");
  }

  async function copyLink(p) {
    await copy(productLink(p), `Link for #${p.seq} copied`);
    setCopiedIds((ids) => (ids.includes(p._id) ? ids : [...ids, p._id]));
  }

  if (!products) return <Skeleton rows={5} />;

  if (stories) {
    return (
      <div className="max-w-[760px]">
        <PageHeader title={`${stories.length} ${stories.length === 1 ? "story" : "stories"} ready`}
          sub={price === "none" ? "Without price · the tag is left for the link sticker" : "With price"}
          actions={<button type="button" onClick={() => setStories(null)} className={btn("ghost")}>Back</button>} />
        <p className="rounded-2xl bg-adm-sunk px-3.5 py-3 text-[12.5px] text-adm-soft leading-relaxed mb-3">
          1. Save all to Photos. 2. In Instagram, add a story and pick them all from your gallery.
          3. On each one, tap <b>Copy link</b> here, add a link sticker and paste{price === "none" ? ", then put the sticker on the empty tag" : ""}.
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
      <PageHeader title="Stories" sub={`Pick up to ${MAX} live products and make all their Instagram stories at once`} />
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
        <div className="mb-24">
          {shown.map((p) => (
            <PickRow key={p._id} product={p} picked={ids.includes(p._id)} disabled={full && !ids.includes(p._id)} onToggle={() => toggle(p._id)} />
          ))}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom,0px))] lg:bottom-0 lg:start-[232px] z-20 bg-adm-bg/95 backdrop-blur border-t border-adm-line px-4 lg:px-8 py-3">
        <div className="max-w-[760px] flex items-center gap-3">
          {ids.length > 0 && (
            <button type="button" onClick={() => setPicked([])} className={btn("ghost")}>Clear</button>
          )}
          <button type="button" onClick={make} disabled={!ids.length || !!making} className={`${btn("primary", "lg")} flex-1`}>
            {making ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Making {making.done + 1} of {making.total}…</>
            ) : ids.length ? `Make ${ids.length} ${ids.length === 1 ? "story" : "stories"}${full ? " (max)" : ""}` : "Pick products"}
          </button>
        </div>
      </div>
    </div>
  );
}
