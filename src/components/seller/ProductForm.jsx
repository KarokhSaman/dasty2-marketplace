import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useImageUpload } from "@/lib/useImageUpload";
import { photoProps } from "@/lib/images";
import { offerAppliesTo, resolveProfit } from "@/convex/fees";
import { calculateProfit, normalizeDigits, formatNumberLocale } from "@/lib/utils";
import { CATEGORY_CONFIG, getCategoryLabel } from "@/lib/categories";
import { brandFitsCategory, getBrandChoices, OTHER_BRAND } from "@/lib/brands";
import StoreStockFields from "@/components/seller/StoreStockFields";
import CustomSelect from "@/components/ui/CustomSelect";
import { useToast, IconTrash, IconCheck, IconX } from "@/components/admin/ui";

const MAX_PHOTOS = 5;
const CATEGORIES = CATEGORY_CONFIG.filter((c) => c.value !== "all");

const label = "block text-[14.5px] font-bold text-adm-ink mb-2";
const field = "w-full h-12 rounded-[13px] border-[1.5px] border-adm-line bg-adm-surface px-3.5 text-[15px] text-adm-ink outline-none focus:border-adm-fade placeholder:text-adm-fade";
const chip = "h-9 px-3 rounded-full border border-adm-line bg-adm-surface text-[13px] font-semibold text-adm-soft whitespace-nowrap hover:border-adm-fade";
// Small category picture for the dropdown: the same icons as the home page
// category bar, on the same sand tile. Falls back to a plain tile.
function CategoryIcon({ src }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="w-8 h-8 rounded-[10px] bg-[var(--color-sand)] grid place-items-center overflow-hidden">
      {src && !broken && <img src={src} alt="" className="w-[78%] h-[78%] object-contain" loading="lazy" onError={() => setBroken(true)} />}
    </span>
  );
}

const ClearX = ({ onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className="absolute end-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full bg-adm-sunk text-adm-fade hover:text-adm-ink">
    <IconX className="w-3.5 h-3.5" />
  </button>
);

function Section({ title, required, extra, error, children }) {
  return (
    <section>
      <p className={label}>
        {title}{required && <span className="text-[var(--color-ember-500)]"> *</span>}{extra && <span className="text-[12.5px] font-semibold text-adm-fade"> · {extra}</span>}
      </p>
      {children}
      {error && <p className="mt-1.5 text-[12.5px] font-semibold text-st-rejected">{error}</p>}
    </section>
  );
}

// A chosen photo with a remove button. Which photo buyers see first, and any
// rotation, is decided by an admin.
function PhotoTile({ url, index, onRemove }) {
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-adm-sunk">
      <img {...photoProps(url, 320)} alt="" className="w-full h-full object-cover" />
      <button type="button" aria-label={m.removePhoto()} onClick={() => onRemove(index)}
        className="absolute top-1.5 end-1.5 w-8 h-8 rounded-full grid place-items-center bg-white/95 text-[#c53030] shadow">
        <IconTrash className="w-4 h-4" />
      </button>
    </div>
  );
}

// The add and edit product form: photos first, then category and brand
// dropdowns (brand follows the category), condition, title (with a suggestion),
// price with what the seller keeps, description hints, and a floating submit
// bar listing what is still missing.
export default function ProductForm({ initial, seller, activeOffer, submitLabel, onSubmit, top }) {
  const locale = getLocale();
  const upload = useImageUpload();
  const toast = useToast();
  const fileRef = useRef(null);

  const [photos, setPhotos] = useState(() => initial?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [condition, setCondition] = useState(initial?.condition ?? "used");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const liveBrands = useQuery(api.products.listBrands, category ? { category } : "skip");
  const brandCounts = useMemo(() => Object.fromEntries((liveBrands ?? []).map((b) => [b.brand, b.count])), [liveBrands]);
  const managedStores = useQuery(api.stores.listMine);
  const linkedStore = useQuery(api.stores.getLinked);
  // null = not chosen yet (an owner account then defaults to its own store); "" = no store
  const [pickedStoreId, setStoreId] = useState(initial ? (initial.storeId ?? "") : null);
  const [stock, setStock] = useState(initial?.stock != null ? String(initial.stock) : "");
  const ownerOnly = !!linkedStore && managedStores !== undefined && managedStores.length === 0;
  const selectableStores = [...(linkedStore ? [linkedStore] : []), ...(managedStores ?? [])];
  const storeId = ownerOnly ? linkedStore._id : (pickedStoreId ?? linkedStore?._id ?? "");

  const priceNum = Number(normalizeDigits(price).replace(/[^\d]/g, "")) || 0;
  // Show the price (and what the seller keeps) in the digits they typed:
  // Kurdish/Arabic digits from a Kurdish keyboard, 0-9 from an English one.
  const digitStyle = /[٠-٩۰-۹]/.test(price) ? "ckb" : "en";
  const feeSource = selectableStores.find((s) => s._id === storeId) ?? seller;
  const customFee = !!feeSource?.feeMode && feeSource.feeMode !== "default";
  const fee = resolveProfit(priceNum, feeSource, activeOffer ?? null);
  const offerHit = priceNum >= 5000 && !customFee && offerAppliesTo(activeOffer, priceNum);

  const brandChoices = category ? getBrandChoices(category, brand, brandCounts) : [];
  const suggestion = category ? [brand && brand !== OTHER_BRAND ? brand : null, getCategoryLabel(category, locale)].filter(Boolean).join(" ") : "";

  const steps = [
    [photos.length >= 2, m.stepPhotos()],
    [!!category, m.fieldCategory()],
    [priceNum >= 5000, m.stepPrice()],
    [title.trim().length > 0, m.fieldTitle()],
  ];
  const left = steps.filter(([ok]) => !ok).length;

  async function addFiles(e) {
    const room = MAX_PHOTOS - photos.length - uploading;
    const files = Array.from(e.target.files ?? []).slice(0, room);
    e.target.value = "";
    for (const file of files) {
      setUploading((n) => n + 1);
      upload(file)
        .then((url) => setPhotos((list) => (list.length < MAX_PHOTOS ? [...list, url] : list)))
        .catch((err) => toast(
          err.code === "unsupported_file_type" ? "JPEG · PNG · WEBP" : err.code === "file_too_large" ? "8 MB max" : m.errorGeneral(), "error"))
        .finally(() => setUploading((n) => n - 1));
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (left > 0 || uploading > 0) { setShowErrors(true); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(), category, brand: brand || undefined,
        condition: storeId ? "new" : condition, price: priceNum,
        description: description.trim(), photos,
        storeId: storeId || undefined,
        stock: storeId && stock ? Number(normalizeDigits(stock)) : undefined,
      });
    } catch {
      toast(m.errorGeneral(), "error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6 pb-40">
      {top}

      <Section title={m.fieldPhotos()} required extra={<span className="tabular-nums">{formatNumberLocale(photos.length + uploading, locale)}/{formatNumberLocale(MAX_PHOTOS, locale)}</span>}
        error={showErrors && photos.length < 2 ? m.atLeastOnePhoto() : null}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((url, i) => (
            <PhotoTile key={url} url={url} index={i}
              onRemove={(idx) => setPhotos((list) => list.filter((_, j) => j !== idx))} />
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`up${i}`} className="aspect-square rounded-2xl bg-adm-sunk grid place-items-center">
              <span className="w-6 h-6 border-2 border-adm-line border-t-[var(--color-ember-500)] rounded-full animate-spin" />
            </div>
          ))}
          {photos.length + uploading < MAX_PHOTOS && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-2xl border-[1.5px] border-dashed border-adm-fade bg-adm-surface flex flex-col items-center justify-center gap-1 text-[12px] font-bold text-adm-soft hover:border-[var(--color-ember-300)]">
              <svg className="w-6 h-6 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" />
              </svg>
              {m.addPhotoBtn()}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />
        <p className="text-[12px] text-adm-fade mt-2 leading-relaxed">{m.photosHint()} {m.photoTip()}</p>
      </Section>

      <Section title={m.fieldCategory()} required error={showErrors && !category ? m.errCategoryRequired() : null}>
        <CustomSelect
          value={category}
          onChange={(next) => { setCategory(next); setBrand((b) => (brandFitsCategory(b, next) ? b : "")); }}
          placeholder={m.fieldCategoryPlaceholder()}
          error={showErrors && !category}
          listClassName="max-h-64"
          options={CATEGORIES.map((c) => ({ value: c.value, label: getCategoryLabel(c.value, locale), icon: <CategoryIcon src={c.img} /> }))}
        />
      </Section>

      <Section title={m.fieldBrand()} extra={m.optionalLabel()}>
        <div className="relative">
          <CustomSelect
            value={brand}
            onChange={setBrand}
            disabled={!category}
            placeholder={category ? m.fieldBrandPlaceholder() : m.brandPickCategoryFirst()}
            listClassName="max-h-64"
            options={brandChoices.map((b) => ({
              value: b,
              label: b === OTHER_BRAND ? m.otherBrand() : b,
              hint: brandCounts[b] ? m.storeProductsCount({ count: brandCounts[b] }) : undefined,
            }))}
          />
          {brand && <ClearX onClick={() => setBrand("")} label={m.filterReset()} />}
        </div>
      </Section>

      {!storeId && (
        <Section title={m.fieldCondition()} required>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-[14px] bg-adm-sunk">
            {[["new", m.conditionNew()], ["likenew", m.conditionLikeNew()], ["used", m.conditionUsed()]].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={condition === v} onClick={() => setCondition(v)}
                className={`h-10 rounded-[11px] text-[13.5px] font-bold transition-colors ${condition === v ? "bg-[var(--color-ember-500)] text-white shadow-[0_4px_12px_-4px_rgba(237,0,64,0.55)]" : "text-adm-soft hover:text-adm-ink"}`}>{l}</button>
            ))}
          </div>
        </Section>
      )}

      <Section title={m.fieldTitle()} required error={showErrors && !title.trim() ? m.errTitleRequired() : null}>
        <input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={m.fieldTitlePlaceholder()} className={field} />
        {suggestion && title.trim() !== suggestion && (
          <div className="flex items-center gap-2 mt-2 text-[12.5px] text-adm-fade flex-wrap">
            {m.titleSuggestion()}
            <button type="button" onClick={() => setTitle(suggestion)}
              className="h-8 px-3 rounded-full border border-dashed border-[var(--color-ember-500)] bg-adm-accent-soft text-[var(--color-ember-600)] font-bold">{suggestion}</button>
          </div>
        )}
      </Section>

      <Section title={m.fieldPrice()} required error={showErrors && priceNum < 5000 ? (price ? m.priceRange() : m.errPriceRequired()) : null}>
        <div className="relative">
          <input id="pf-price" inputMode="numeric" dir={locale === "en" ? "ltr" : "rtl"} value={priceNum ? formatNumberLocale(priceNum, digitStyle) : price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d٠-٩۰-۹]/g, ""))}
            placeholder={m.fieldPricePlaceholder()} className={`${field} tabular-nums font-semibold ${price ? "pe-24" : "pe-14"}`} />
          <span className={`absolute top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-adm-fade ${price ? "end-11" : "end-3.5"}`}>IQD</span>
          {price && <ClearX onClick={() => setPrice("")} label={m.filterReset()} />}
        </div>
        {priceNum >= 5000 ? (
          <>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded-xl bg-st-approved-bg px-3 py-2.5">
                <p className="text-[11px] font-semibold text-adm-fade">{m.youReceive()}</p>
                <p className="text-[17px] font-bold text-st-approved tabular-nums"><span>{formatNumberLocale(priceNum - fee, digitStyle)}</span></p>
              </div>
              <div className="rounded-xl bg-adm-sunk px-3 py-2.5">
                <p className="text-[11px] font-semibold text-adm-fade">{m.acctFeesFeeCol()}</p>
                <p className="text-[17px] font-bold tabular-nums">
                  <span>{formatNumberLocale(fee, digitStyle)}</span>
                  {offerHit && calculateProfit(priceNum) !== fee && <s className="text-[12px] font-semibold text-adm-fade ms-1.5">{formatNumberLocale(calculateProfit(priceNum), digitStyle)}</s>}
                </p>
              </div>
            </div>
            {offerHit && <p className="mt-2 rounded-xl bg-st-approved-bg text-st-approved text-[12.5px] font-bold px-3 py-2">✓ {m.offerAppliedTitle({ title: activeOffer.title })}</p>}
          </>
        ) : <p className="text-[12px] text-adm-fade mt-1.5">{m.priceRange()}</p>}
      </Section>

      <StoreStockFields stores={selectableStores} lockedStore={ownerOnly ? linkedStore : null} storeId={storeId} onStoreChange={setStoreId} stock={stock} onStockChange={setStock} />

      <Section title={m.descSectionTitle()}>
        <textarea id="pf-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={m.fieldDescriptionPlaceholder()} className={`${field} h-auto py-3 leading-relaxed resize-y`} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            m.descHintSize(), m.descHintAge(), m.descHintWeight(), m.descHintUsed(), m.descHintIncluded(),
            m.descHintMusic(), m.descHintRock(), m.descHintHeight(), m.descHintFold(), m.descHintMarks(),
          ].filter((h) => !description.includes(h.trim())).map((h) => (
            <button key={h} type="button" className={chip}
              onClick={() => { setDescription((d) => (d.trim() ? `${d.trimEnd()}\n${h}` : h)); document.getElementById("pf-desc")?.focus(); }}>
              + {h.replace(/:\s*$/, "")}
            </button>
          ))}
        </div>
      </Section>

      {/* Floating submit card (phones) / full-width button (larger screens), as before. */}
      <div className="sm:static fixed inset-x-0 bottom-0 z-30 px-3 sm:px-0 pt-2 pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="pointer-events-auto mx-auto max-w-md sm:max-w-none surface-frost rounded-[1.75rem] sm:rounded-none border sm:border-0 border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(11,12,15,0.22)] sm:shadow-none p-3 sm:p-0">
          {left > 0 && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-2.5 text-[12px] font-bold">
              {steps.map(([ok, l]) => (
                <span key={l} className={`inline-flex items-center gap-1.5 ${ok ? "text-st-approved" : "text-adm-fade"}`}>
                  <span className={`w-4 h-4 rounded-full grid place-items-center ${ok ? "bg-st-approved text-white" : "border-[1.5px] border-current"}`}>
                    {ok && <IconCheck className="w-2.5 h-2.5" />}
                  </span>
                  {l}
                </span>
              ))}
            </div>
          )}
          <button type="submit" disabled={submitting || uploading > 0}
            className="w-full bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] active:bg-[var(--color-ember-700)] text-white font-semibold py-3 sm:py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50 text-[15px]">
            {submitting ? m.submitting() : uploading > 0 ? m.uploading() : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
