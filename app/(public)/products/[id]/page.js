"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";
import Link from "next/link";

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

function formatPrice(price) {
  return price.toLocaleString("en-US") + " IQD";
}

// ── Compact related product card ──────────────────────────
function RelatedCard({ product, t }) {
  const photo = product.photos?.[0];
  return (
    <Link href={`/products/${product._id}`} className="group block">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-rose-100 transition-all duration-200">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {photo ? (
            <img src={photo} alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <span className={`absolute top-2 start-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
            product.condition === "new" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {product.condition === "new" ? t.badgeNew : t.badgeUsed}
          </span>
        </div>
        <div className="p-2.5">
          <h3 className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[2rem]">
            {product.title}
          </h3>
          <p className="text-rose-600 font-bold text-sm">{formatPrice(product.price)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, locale } = useT();
  const product    = useQuery(api.products.getPublicById, id ? { id } : "skip");
  const allProducts = useQuery(api.products.getPublic);
  const [activePhoto, setActivePhoto] = useState(0);

  const productUrl = typeof window !== "undefined"
    ? `${window.location.origin}/products/${id}`
    : `https://dasty2mndalan.com/products/${id}`;

  const waLink = product
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        t.waMessage(product.seq ?? "", product.title, formatPrice(product.price), productUrl)
      )}`
    : "#";

  const related = allProducts && product
    ? allProducts
        .filter(p => p.category === product.category && p._id !== product._id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
    : [];

  if (product === undefined) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="aspect-square bg-gray-200 rounded-xl" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <p className="text-xl font-medium mb-2">{t.notFound}</p>
        <button onClick={() => router.back()} className="text-sm text-rose-500 hover:underline mt-2">
          {t.back}
        </button>
      </div>
    );
  }

  const photos = product.photos?.length ? product.photos : [];

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-5"
      >
        <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t.back}
      </button>

      {/* ── Product ── */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Photos */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3">
            {photos.length > 0 ? (
              <img src={photos[activePhoto]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((src, i) => (
                <button key={i} onClick={() => setActivePhoto(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activePhoto === i ? "border-rose-500" : "border-transparent"}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {getCategoryLabel(product.category, locale)}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              product.condition === "new" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>
              {product.condition === "new" ? t.badgeNew : t.badgeUsed}
            </span>
            {product.featured && (
              <span className="text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-600 font-medium">{t.featured}</span>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{product.title}</h1>
          <p className="text-3xl font-bold text-rose-600 mb-5">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{product.description}</p>
          )}

          {product.seq && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">{t.productCode}:</span>
              <span className="text-xs font-mono font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md tracking-widest">
                {product.seq}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {getCityLabel(product.city || "Erbil", locale) ?? product.city ?? "Erbil"}
          </div>

          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm mt-6">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t.contactToBuy}
          </a>
        </div>
      </div>

      {/* ── Related products ── */}
      {related.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              {getCategoryLabel(product.category, locale)}
            </p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {related.map(p => (
              <div key={p._id} className="shrink-0 w-40">
                <RelatedCard product={p} t={t} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
