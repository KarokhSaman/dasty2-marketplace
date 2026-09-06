import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useParams, useLocation, useSearch } from "@tanstack/react-router";
const usePathname = () => useLocation({ select: (l) => l.pathname });
const useSearchParams = () => {
  const s = useSearch({ strict: false }) || {};
  return {
    get: (k) => (s[k] ?? null),
    getAll: (k) => (Array.isArray(s[k]) ? s[k] : s[k] != null ? [s[k]] : []),
  };
};
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useSellerSession } from "@/lib/useSellerSession";
import { useImageUpload } from "@/lib/useImageUpload";
import { calculateProfit, formatPrice, formatPriceLocale, normalizeDigits } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG, getCategoryLabel } from "@/lib/categories";
import { getAllBrands } from "@/lib/brands";

const CATEGORIES = CATEGORY_CONFIG.filter(c => c.value !== "all").map(c => c.value);

const MAX_PHOTOS = 5;

export default function RepostPage() {
  const locale = getLocale();
  const { id } = useParams({ strict: false });
  const router = useRouter();
  const { seller, loading: sessionLoading } = useSellerSession();
  const fileInputRef = useRef(null);

  const source    = useQuery(api.products.getById, id ? { id } : "skip");
  const addProduct = useMutation(api.products.add);
  const uploadImage = useImageUpload();
  const activeOffer = useQuery(api.offers.getActive);

  // Form state
  const [title, setTitle]             = useState("");
  const [category, setCategory]       = useState("");
  const [brand, setBrand]             = useState("");
  const [condition, setCondition]     = useState("new");
  const [price, setPrice]             = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos]           = useState([]);
  const [uploading, setUploading]     = useState(0);
  const [errors, setErrors]           = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [ready, setReady]             = useState(false);

  // Pre-fill once source product loads
  useEffect(() => {
    if (!source || ready) return;
    setTitle(source.title ?? "");
    setCategory(source.category ?? "");
    setBrand(source.brand ?? "");
    setCondition(source.condition ?? "new");
    setPrice(String(source.price ?? ""));
    setDescription(source.description ?? "");
    setPhotos(source.photos ?? []);
    setReady(true);
  }, [source, ready]);

  const priceNum = Number(normalizeDigits(price).replace(/[^\d]/g, "")) || 0;
  const standardProfit = calculateProfit(priceNum);
  const profit = activeOffer
    ? (activeOffer.type === "free" ? 0 : (activeOffer.flatFeeAmount ?? 0))
    : standardProfit;

  async function uploadFile(file) {
    setUploading((n) => n + 1);
    try {
      const url = await uploadImage(file);
      setPhotos((prev) => [...prev, url]);
    } catch {
      // invalid type/size or upload failure — skip this file silently
    } finally {
      setUploading((n) => n - 1);
    }
  }

  function handleFileChange(e) {
    Array.from(e.target.files ?? []).forEach(uploadFile);
    e.target.value = "";
  }

  function validate() {
    const errs = {};
    if (!title.trim())                          errs.title    = true;
    if (!category)                              errs.category = true;
    if (!price || priceNum < 5000)              errs.price    = true;
    if (photos.length === 0 && uploading === 0) errs.photos   = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate() || uploading > 0 || !seller) return;
    setSubmitting(true);
    try {
      await addProduct({
        title: title.trim(),
        category,
        brand: brand || undefined,
        condition,
        price: priceNum,
        description: description.trim(),
        photos,
      });
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (sessionLoading || !seller || source === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found / wrong seller ──────────────────────────────
  if (!source || source.sellerId !== seller._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--color-ink-fade)]">
        <p className="text-lg font-medium">{m.notFound()}</p>
        <button onClick={() => router.navigate({ to: "/seller" })} className="mt-4 text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={locale === "en" ? "M15 19l-7-7 7-7" : "M9 19l7-7-7-7"} />
          </svg>
          {m.back()}
        </button>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[var(--color-ink)] font-medium max-w-sm">{m.repostSuccess()}</p>
        <button onClick={() => router.navigate({ to: "/seller" })} className="mt-6 text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={locale === "en" ? "M15 19l-7-7 7-7" : "M9 19l7-7-7-7"} />
          </svg>
          {m.back()}
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto sm:pb-0 pb-[140px]">
      <button onClick={() => router.navigate({ to: "/seller" })} className="mb-4 text-sm text-rose-600 hover:underline flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={locale === "en" ? "M15 19l-7-7 7-7" : "M9 19l7-7-7-7"} />
        </svg>
        {m.back()}
      </button>

      <h1 className="font-display text-[22px] text-[var(--color-ink)] mb-2">{m.repostPageTitle()}</h1>

      {/* Info notice */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
        <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">{m.repostNote()}</p>
      </div>

      <form id="repost-product-form" onSubmit={handleSubmit} className="space-y-5">

        {/* Title */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
            {m.fieldTitle()} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={m.fieldTitlePlaceholder()}
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:ring-4 transition ${errors.title ? "border-red-400 bg-red-50" : "border-[var(--color-hairline)] focus:border-[var(--color-ember-300)] focus:ring-[var(--color-ember-100)]/50"}`}
          />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
              {m.fieldCategory()} <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              placeholder={m.fieldCategoryPlaceholder()}
              error={errors.category}
              options={CATEGORIES.map(c => ({ value: c, label: getCategoryLabel(c, locale) }))}
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
              {m.fieldCondition()} <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-1.5">
              {["new","likenew","used"].map((c) => (
                <button key={c} type="button" onClick={() => setCondition(c)}
                  className={`flex-1 h-10 px-3 text-xs font-medium transition-colors rounded-xl border flex items-center justify-center ${condition === c ? "bg-[var(--color-ember-500)] text-white border-[var(--color-ember-500)]" : "border-[var(--color-hairline)] text-[var(--color-ink)] hover:border-[var(--color-ember-300)] hover:bg-[var(--color-cream)]"}`}>
                  {c === "new" ? m.conditionNew() : c === "likenew" ? m.conditionLikeNew() : m.conditionUsed()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldBrand()}</label>
          <div className="relative">
            <CustomSelect
              value={brand}
              onChange={setBrand}
              placeholder={m.fieldBrandPlaceholder()}
              options={[...getAllBrands().map(b => ({ value: b, label: b })), { value: "Other", label: "Other" }]}
            />
            {brand && (
              <button type="button" onClick={() => setBrand("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-cream-deep)] hover:bg-[var(--color-cream-deep)] text-[var(--color-ink-fade)] hover:text-[var(--color-ink-soft)] transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
            {m.fieldPrice()} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text" inputMode="decimal"
            dir={locale === "en" ? "ltr" : "rtl"}
            value={price}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d٠-٩۰-۹]/g, "");
              setPrice(val);
            }}
            placeholder={m.fieldPricePlaceholder()}
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:ring-4 transition ${locale === "en" ? "pr-10" : "pl-10"} ${errors.price ? "border-red-400 bg-red-50" : "border-[var(--color-hairline)] focus:border-[var(--color-ember-300)] focus:ring-[var(--color-ember-100)]/50"}`}
          />
          {price && priceNum >= 5000 && (
            activeOffer ? (
              <div className={`mt-2 rounded-lg px-3 py-2 ${
                activeOffer.type === "free"
                  ? "bg-green-50 border border-green-100"
                  : "bg-amber-50 border border-amber-100"
              }`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">🎉 {activeOffer.title}</span>
                </div>
                {activeOffer.type === "free" ? (
                  <p className="text-sm text-green-700">
                    {m.profitLabel()} <span className="font-bold line-through text-[var(--color-ink-fade)]">{formatPriceLocale(standardProfit, locale)}</span>{" "}
                    <span className="font-bold text-green-600">{m.offerFreeLabel()}</span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-700">
                    {m.profitLabel()} <span className="font-bold line-through text-[var(--color-ink-fade)]">{formatPriceLocale(standardProfit, locale)}</span>{" "}
                    <span className="font-bold text-amber-600">{formatPriceLocale(profit, locale)}</span>
                  </p>
                )}
              </div>
            ) : profit > 0 ? (
              <p className="mt-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                {m.profitLabel()} <span className="font-bold">{formatPriceLocale(profit, locale)}</span>
              </p>
            ) : null
          )}
          {errors.price && <p className="mt-1 text-xs text-red-500">{m.priceRange()}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldDescription()}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={m.fieldDescriptionPlaceholder()} rows={4}
            className="w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-[var(--color-ink)] placeholder:text-[var(--color-ink-fade)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition resize-none" />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
            {m.fieldPhotos()} <span className="text-rose-500">*</span>
          </label>

          {/* Existing + new thumbnails */}
          {(photos.length > 0 || uploading > 0) && (
            <div className="flex gap-3 flex-wrap mb-3">
              {photos.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--color-hairline)]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                    className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80">×</button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={i} className="w-20 h-20 rounded-lg bg-[var(--color-cream-deep)] border border-[var(--color-hairline)] flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={photos.length + uploading >= MAX_PHOTOS}
            className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${errors.photos ? "border-red-300 bg-red-50" : "border-[var(--color-hairline)] hover:border-rose-300 hover:bg-rose-50 disabled:hover:border-[var(--color-hairline)] disabled:hover:bg-white"}`}>
            <svg className="w-8 h-8 text-[var(--color-ink-fade)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-[var(--color-ink-soft)]">{m.addPhotoBtn()}</p>
            <p className="text-xs text-[var(--color-ink-fade)] mt-1">
              {photos.length + uploading}/{MAX_PHOTOS} · JPEG · PNG · WEBP
            </p>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {errors.photos && <p className="mt-1 text-xs text-red-500">{m.atLeastOnePhoto()}</p>}
        </div>

        <button type="submit" disabled={submitting || uploading > 0}
          className="hidden sm:block w-full bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] active:bg-[var(--color-ember-700)] text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50">
          {submitting ? m.submitting() : uploading > 0 ? m.uploading() : m.submitProductBtn()}
        </button>
      </form>

      {/* Mobile sticky submit button */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md surface-frost rounded-[1.75rem] border border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(11,12,15,0.22)] p-3">
          <button form="repost-product-form" type="submit" disabled={submitting || uploading > 0}
            className="w-full bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] active:bg-[var(--color-ember-700)] text-white font-semibold py-3 rounded-full active:scale-[0.98] transition disabled:opacity-50 text-[15px]">
            {submitting ? m.submitting() : uploading > 0 ? m.uploading() : m.submitProductBtn()}
          </button>
        </div>
      </div>
    </div>
  );
}
