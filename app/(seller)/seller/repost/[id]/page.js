"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSellerSession } from "@/lib/useSellerSession";
import { calculateProfit, formatPrice } from "@/lib/utils";
import CustomSelect from "@/components/ui/CustomSelect";
import { getCategoryLabel } from "@/lib/categories";

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

export default function RepostPage() {
  const { t, locale } = useT();
  const { id } = useParams();
  const router = useRouter();
  const { seller, loading: sessionLoading } = useSellerSession();
  const fileInputRef = useRef(null);

  const source    = useQuery(api.products.getById, id ? { id } : "skip");
  const addProduct = useMutation(api.products.add);

  // Form state
  const [title, setTitle]             = useState("");
  const [category, setCategory]       = useState("");
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
    setCondition(source.condition ?? "new");
    setPrice(String(source.price ?? ""));
    setDescription(source.description ?? "");
    setPhotos(source.photos ?? []);
    setReady(true);
  }, [source, ready]);

  const profit = calculateProfit(Number(price));

  async function uploadFile(file) {
    setUploading((n) => n + 1);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading((n) => n - 1);
    if (data.url) setPhotos((prev) => [...prev, data.url]);
  }

  function handleFileChange(e) {
    Array.from(e.target.files ?? []).forEach(uploadFile);
    e.target.value = "";
  }

  function validate() {
    const errs = {};
    if (!title.trim())                          errs.title    = true;
    if (!category)                              errs.category = true;
    if (!price || Number(price) < 5000)         errs.price    = true;
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
        condition,
        price: Number(price),
        description: description.trim(),
        photos,
        city: seller.city || "Erbil",
        sellerId: seller._id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        dateAdded: new Date().toISOString(),
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <p className="text-lg font-medium">{t.notFound}</p>
        <button onClick={() => router.push("/seller")} className="mt-4 text-sm text-rose-500 hover:underline">
          ← {t.sellerDashboard}
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
        <p className="text-gray-700 font-medium max-w-sm">{t.repostSuccess}</p>
        <button onClick={() => router.push("/seller")} className="mt-6 text-sm text-rose-600 hover:underline">
          ← {t.sellerDashboard}
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push("/seller")} className="text-sm text-gray-400 hover:text-rose-600 transition-colors mb-3">
        ← {t.sellerDashboard}
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-2">{t.repostPageTitle}</h1>

      {/* Info notice */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
        <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">{t.repostNote}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.fieldTitle} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={t.fieldTitlePlaceholder}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
          />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.fieldCategory} <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              placeholder={t.fieldCategoryPlaceholder}
              error={errors.category}
              options={CATEGORIES.map(c => ({ value: c, label: getCategoryLabel(c, locale) }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.fieldCondition} <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {["new","used"].map((c) => (
                <button key={c} type="button" onClick={() => setCondition(c)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${condition === c ? "bg-rose-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  {c === "new" ? t.conditionNew : t.conditionUsed}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.fieldPrice} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            placeholder={t.fieldPricePlaceholder} min={0} dir="ltr"
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${errors.price ? "border-red-400 bg-red-50" : "border-gray-200"}`}
          />
          {price && Number(price) >= 5000 && profit > 0 && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {t.profitLabel} <span className="font-bold">{formatPrice(profit)}</span>
            </p>
          )}
          {errors.price && <p className="mt-1 text-xs text-red-500">{t.priceMinimum}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.fieldDescription}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t.fieldDescriptionPlaceholder} rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.fieldPhotos} <span className="text-rose-500">*</span>
          </label>

          {/* Existing + new thumbnails */}
          {(photos.length > 0 || uploading > 0) && (
            <div className="flex gap-3 flex-wrap mb-3">
              {photos.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                    className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80">×</button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={i} className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-colors ${errors.photos ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-rose-300 hover:bg-rose-50"}`}>
            <p className="text-sm text-gray-500">+ {t.addPhotoBtn}</p>
            <p className="text-xs text-gray-400 mt-0.5">JPEG · PNG · WEBP</p>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {errors.photos && <p className="mt-1 text-xs text-red-500">{t.atLeastOnePhoto}</p>}
        </div>

        <button type="submit" disabled={submitting || uploading > 0}
          className="w-full bg-rose-600 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
          {submitting ? t.submitting : uploading > 0 ? t.uploading : t.submitProductBtn}
        </button>
      </form>
    </div>
  );
}
