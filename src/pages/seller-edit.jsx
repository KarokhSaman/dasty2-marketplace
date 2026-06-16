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
import { calculateProfit, formatPrice, normalizeDigits } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { getCategoryLabel } from "@/lib/categories";
import { getBrandOptions, hasBrandOption } from "@/lib/brands";

const CATEGORIES = [
  "Strollers & Travel",
  "Car Seats",
  "Carry Cot",
  "Bed",
  "Feeding & Nursing",
  "Bouncers & Swings",
  "High Chairs",
  "Toys & Play",
  "Electronics & Monitors",
  "Other",
];

const EDITABLE_STATUSES = ["pending", "approved", "rejected"];

export default function EditProductPage() {
  const locale = getLocale();
  const { id } = useParams({ strict: false });
  const router = useRouter();
  const { seller, loading: sessionLoading } = useSellerSession();
  const fileInputRef = useRef(null);

  const product = useQuery(api.products.getById, id ? { id } : "skip");
  const sellerUpdate = useMutation(api.products.sellerUpdate);
  const uploadImage = useImageUpload();

  // Form state — initialised from product once loaded
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

  // Populate form once product loads
  useEffect(() => {
    if (!product) return;
    setTitle(product.title ?? "");
    setCategory(product.category ?? "");
    setBrand(product.brand ?? "");
    setCondition(product.condition ?? "new");
    setPrice(String(product.price ?? ""));
    setDescription(product.description ?? "");
    setPhotos(product.photos ?? []);
  }, [product]);

  const priceNum = Number(normalizeDigits(price).replace(/[^\d]/g, "")) || 0;
  const profit = calculateProfit(priceNum);

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
      await sellerUpdate({
        id,
        title: title.trim(),
        category,
        brand: brand || undefined,
        condition,
        price: priceNum,
        description: description.trim(),
        photos,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  // Loading states
  if (sessionLoading || !seller || product === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Wrong seller or not found
  if (!product || product.sellerId !== seller._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--color-ink-fade)]">
        <p className="text-lg font-medium">{m.notFound()}</p>
        <button onClick={() => router.navigate({ to: "/seller" })} className="mt-4 text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {m.back()}
        </button>
      </div>
    );
  }

  // Cannot edit sold/paid
  if (!EDITABLE_STATUSES.includes(product.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--color-ink-fade)]">
        <p className="text-lg font-medium">{m.cannotEdit()}</p>
        <button onClick={() => router.navigate({ to: "/seller" })} className="mt-4 text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {m.back()}
        </button>
      </div>
    );
  }

  // Success
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[var(--color-ink)] font-medium max-w-sm">{m.productSubmitted()}</p>
        <button onClick={() => router.navigate({ to: "/seller" })} className="mt-6 text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {m.back()}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.navigate({ to: "/seller" })} className="text-sm text-rose-600 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {m.back()}
        </button>
      </div>

      <h1 className="font-display text-[22px] text-[var(--color-ink)] mb-2">{m.editProductTitle()}</h1>

      {/* Re-approval notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-amber-700">{m.editNote()}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="flex rounded-xl border border-[var(--color-hairline)] overflow-hidden h-10">
              {["new","likenew","used"].map((c) => (
                <button key={c} type="button" onClick={() => setCondition(c)}
                  className={`flex-1 text-xs font-medium transition-colors flex items-center justify-center ${condition === c ? "bg-[var(--color-ember-500)] text-white" : "text-[var(--color-ink)] hover:bg-[var(--color-cream)]"}`}>
                  {c === "new" ? m.conditionNew() : c === "likenew" ? m.conditionLikeNew() : m.conditionUsed()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasBrandOption(category) && (
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldBrand()}</label>
            <div className="relative">
              <CustomSelect
                value={brand}
                onChange={setBrand}
                placeholder={m.fieldBrandPlaceholder()}
                options={[...getBrandOptions(category).map(b => ({ value: b, label: b })), { value: "Other", label: "Other" }]}
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
        )}

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
          {price && priceNum >= 5000 && profit > 0 && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {m.profitLabel()} <span className="font-bold">{formatPrice(profit)}</span>
            </p>
          )}
          {errors.price && <p className="mt-1 text-xs text-red-500">{m.priceMinimum()}</p>}
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

          {/* Current + new photo thumbnails */}
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
            className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-colors ${errors.photos ? "border-red-300 bg-red-50" : "border-[var(--color-hairline)] hover:border-rose-300 hover:bg-rose-50"}`}>
            <p className="text-sm text-[var(--color-ink-soft)]">+ {m.addPhotoBtn()}</p>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {errors.photos && <p className="mt-1 text-xs text-red-500">{m.atLeastOnePhoto()}</p>}
        </div>

        <button type="submit" disabled={submitting || uploading > 0}
          className="w-full bg-[var(--color-ember-500)] hover:bg-[var(--color-ember-600)] active:bg-[var(--color-ember-700)] text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition disabled:opacity-50">
          {submitting ? m.submitting() : uploading > 0 ? m.uploading() : m.editProductBtn()}
        </button>
      </form>
    </div>
  );
}
