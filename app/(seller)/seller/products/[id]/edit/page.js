"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSellerSession } from "@/lib/useSellerSession";
import { calculateProfit, formatPrice } from "@/lib/utils";

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
  const { t } = useT();
  const { id } = useParams();
  const router = useRouter();
  const { seller, loading: sessionLoading } = useSellerSession();
  const fileInputRef = useRef(null);

  const product = useQuery(api.products.getById, id ? { id } : "skip");
  const sellerUpdate = useMutation(api.products.sellerUpdate);

  // Form state — initialised from product once loaded
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

  // Populate form once product loads
  useEffect(() => {
    if (!product) return;
    setTitle(product.title ?? "");
    setCategory(product.category ?? "");
    setCondition(product.condition ?? "new");
    setPrice(String(product.price ?? ""));
    setDescription(product.description ?? "");
    setPhotos(product.photos ?? []);
  }, [product]);

  const profit = calculateProfit(Number(price));

  async function uploadFile(file) {
    setUploading((n) => n + 1);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
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
      await sellerUpdate({
        id,
        sellerId: seller._id,
        title: title.trim(),
        category,
        condition,
        price: Number(price),
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <p className="text-lg font-medium">{t.notFound}</p>
        <button onClick={() => router.push("/seller")} className="mt-4 text-sm text-rose-500 hover:underline">
          ← {t.sellerDashboard}
        </button>
      </div>
    );
  }

  // Cannot edit sold/paid
  if (!EDITABLE_STATUSES.includes(product.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <p className="text-lg font-medium">{t.cannotEdit}</p>
        <button onClick={() => router.push("/seller")} className="mt-4 text-sm text-rose-500 hover:underline">
          ← {t.sellerDashboard}
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
        <p className="text-gray-700 font-medium max-w-sm">{t.productSubmitted}</p>
        <button onClick={() => router.push("/seller")} className="mt-6 text-sm text-rose-600 hover:underline">
          ← {t.sellerDashboard}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push("/seller")} className="text-sm text-gray-400 hover:text-rose-600 transition-colors">
          ← {t.sellerDashboard}
        </button>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-2">{t.editProductTitle}</h1>

      {/* Re-approval notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-amber-700">{t.editNote}</p>
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
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white ${errors.category ? "border-red-400 bg-red-50" : "border-gray-200"}`}>
              <option value="">{t.fieldCategoryPlaceholder}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
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

          {/* Current + new photo thumbnails */}
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
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {errors.photos && <p className="mt-1 text-xs text-red-500">{t.atLeastOnePhoto}</p>}
        </div>

        <button type="submit" disabled={submitting || uploading > 0}
          className="w-full bg-rose-600 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
          {submitting ? t.submitting : uploading > 0 ? t.uploading : t.editProductBtn}
        </button>
      </form>
    </div>
  );
}
