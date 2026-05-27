import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useParams, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { getCityLabel } from "@/lib/cities";
import { getProductCache, setProductCache } from "@/src/lib/productCache";
import {
  Chip,
  PriceTag,
  Skeleton,
  WhatsAppButton,
  formatAmount,
} from "@/components/ui";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER;

// ── Local icons ────────────────────────────────────────────
function StarIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.39 6.96H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.55L2 8.96h7.61L12 2z" />
    </svg>
  );
}
function PinIcon({ className = "w-3 h-3" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ImagePlaceholder({ size = "lg" }) {
  const cls = size === "lg" ? "w-16 h-16" : "w-8 h-8";
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-cream-deep)]">
      <svg className={`${cls} text-[var(--color-ink-fade)]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

// ── Compact related product card ──────────────────────────
function RelatedCard({ product }) {
  const photo = product.photos?.[0];
  setProductCache(product);
  return (
    <Link to={`/products/${product._id}`} className="group block">
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] overflow-hidden hover:border-[var(--color-ember-200)] hover:shadow-[0_18px_36px_-22px_rgba(26,20,17,0.25)] transition-all duration-300">
        <div className="aspect-square relative overflow-hidden bg-[var(--color-cream-deep)]">
          {photo ? (
            <img src={photo} alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : <ImagePlaceholder size="sm" />}
          <Chip
            tone={product.condition === "new" ? "success" : "warning"}
            className="absolute top-2 start-2 backdrop-blur-md shadow-sm"
            dot
          >
            {product.condition === "new" ? m.badgeNew() : m.badgeUsed()}
          </Chip>
        </div>
        <div className="px-3 py-2.5">
          <h3 className="text-[12.5px] font-semibold text-[var(--color-ink)] line-clamp-2 leading-snug mb-1.5 min-h-[2rem]">
            {product.title}
          </h3>
          <PriceTag amount={product.price} size="sm" />
        </div>
      </div>
    </Link>
  );
}

// ── Loading shimmer ───────────────────────────────────────
function ProductDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton.Bar w="6rem" />
      <Skeleton.Block className="aspect-square rounded-3xl" />
      <Skeleton.Bar w="40%" />
      <Skeleton.Bar w="75%" />
      <Skeleton.Bar w="33%" h="2rem" />
    </div>
  );
}

// ── Not-found state ───────────────────────────────────────
function NotFoundState({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-ember-50)] flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="font-display text-xl font-bold text-[var(--color-ink)] mb-2">{m.notFound()}</p>
      <button onClick={onBack} className="mt-3 text-sm font-semibold text-[var(--color-ember-600)] hover:text-[var(--color-ember-700)]">
        ← {m.back()}
      </button>
    </div>
  );
}

// ── Back arrow row ────────────────────────────────────────
function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ember-600)] transition-colors mb-4 group"
    >
      <span className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white border border-[var(--color-hairline)] group-hover:border-[var(--color-ember-300)] group-hover:bg-[var(--color-ember-50)] transition-colors">
        <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      {m.back()}
    </button>
  );
}

// ── Photo gallery ─────────────────────────────────────────
function PhotoGallery({ photos, title }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="aspect-square bg-white border border-[var(--color-hairline)] rounded-[1.5rem] overflow-hidden mb-3 relative">
        {photos.length > 0 ? (
          <img src={photos[active]} alt={title} key={active} className="w-full h-full object-cover scale-in" />
        ) : <ImagePlaceholder />}

        {photos.length > 1 && (
          <Chip tone="dark" className="absolute bottom-3 end-3">
            {active + 1} / {photos.length}
          </Chip>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {photos.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                active === i
                  ? "border-[var(--color-ember-500)] shadow-[0_6px_14px_-6px_rgba(237,0,64,0.4)]"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Meta line (category · condition · city) ────────────────
function MetaLine({ product, locale }) {
  const cityLabel = getCityLabel(product.city || "Erbil", locale) ?? product.city ?? "Erbil";
  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)] flex-wrap mb-3">
      <span className="font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-fade)] text-[10.5px]">
        {getCategoryLabel(product.category, locale)}
      </span>
      <span className="text-[var(--color-ink-fade)]/60">·</span>
      <span className={`inline-flex items-center gap-1 font-semibold ${
        product.condition === "new" ? "text-[var(--color-jade-600)]" : "text-[var(--color-honey-600)]"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${product.condition === "new" ? "bg-[var(--color-jade-500)]" : "bg-[var(--color-honey-600)]"}`} />
        {product.condition === "new" ? m.badgeNew() : m.badgeUsed()}
      </span>
      <span className="text-[var(--color-ink-fade)]/60">·</span>
      <span className="inline-flex items-center gap-1 font-medium">
        <PinIcon className="w-3 h-3 text-[var(--color-ember-600)]" />
        {cityLabel}
      </span>
    </div>
  );
}

// ── Sticky mobile CTA ─────────────────────────────────────
function StickyMobileCTA({ price, waLink, seq }) {
  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md surface-frost rounded-[1.75rem] border border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(26,20,17,0.28)] p-2.5 flex items-center gap-3">
        <div className="flex flex-col min-w-0 ps-2">
          {seq && (
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-ink-fade)] leading-none">
              {m.productCode()} · {seq}
            </span>
          )}
          <span className={seq ? "mt-1" : ""}>
            <PriceTag amount={price} size="lg" />
          </span>
        </div>
        <WhatsAppButton href={waLink} size="md" className="ms-auto" />
      </div>
    </div>
  );
}

// ── Related products carousel ─────────────────────────────
function RelatedSection({ heading, loading, items }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 px-0.5">
        <h2 className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-[0.18em]">{heading}</h2>
        <div className="flex-1 h-px bg-[var(--color-hairline)]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide snap-x">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-40">
                <Skeleton.Block className="aspect-square rounded-2xl mb-2" />
                <Skeleton.Bar w="75%" />
                <div className="mt-1.5"><Skeleton.Bar w="33%" /></div>
              </div>
            ))
          : items.map((p) => (
              <div key={p._id} className="shrink-0 w-40 snap-start">
                <RelatedCard product={p} />
              </div>
            ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams({ strict: false });
  const router = useRouter();
  const locale = getLocale();
  const live = useQuery(api.products.getPublicById, id ? { id } : "skip");
  const allProducts = useQuery(api.products.getPublic);
  const seed = useMemo(() => getProductCache(id), [id]);
  const product = live ?? seed;

  if (live === null) return <NotFoundState onBack={() => router.history.back()} />;
  if (!product)      return <ProductDetailSkeleton />;

  const productUrl = typeof window !== "undefined"
    ? `${window.location.origin}/products/${id}`
    : `https://dasty2mndalan.com/products/${id}`;

  const waLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    m.waMessage({
      seq: product.seq ?? "",
      title: product.title,
      price: formatAmount(product.price) + " IQD",
      url: productUrl,
    })
  )}`;

  const related = allProducts
    ? allProducts
        .filter(p => p.category === product.category && p._id !== product._id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
    : [];

  const photos = product.photos?.length ? product.photos : [];

  return (
    <div className="max-w-5xl mx-auto pb-28 sm:pb-12">
      <BackButton onClick={() => router.history.back()} />

      <div className="grid md:grid-cols-[1.05fr_1fr] gap-6 md:gap-10 mb-10 md:mb-14 fade-up">
        <PhotoGallery photos={photos} title={product.title} />

        <div className="md:pt-1">
          <MetaLine product={product} locale={locale} />

          <h1 className="font-display text-[26px] sm:text-[34px] font-bold text-[var(--color-ink)] mb-3 leading-[1.1] tracking-tight flex items-start gap-2">
            <span className="flex-1">{product.title}</span>
            {product.featured && (
              <span
                title={m.featured()}
                className="shrink-0 inline-flex items-center justify-center mt-1.5 w-6 h-6 rounded-full bg-[var(--color-ember-500)] text-white shadow-[0_4px_10px_-2px_rgba(237,0,64,0.6)]"
              >
                <StarIcon className="w-3 h-3" />
              </span>
            )}
          </h1>

          <div className="mb-5 flex items-baseline gap-3 flex-wrap">
            <PriceTag amount={product.price} size="xl" />
            {product.seq && (
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--color-ink-fade)]">
                {m.productCode()}
                <span className="font-mono font-bold text-[var(--color-ember-700)] bg-[var(--color-ember-50)] border border-[var(--color-ember-100)] px-2 py-0.5 rounded-md tracking-widest">
                  {product.seq}
                </span>
              </span>
            )}
          </div>

          {product.description && (
            <div className="mt-6 pt-5 border-t border-[var(--color-hairline)]">
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--color-ink-fade)] mb-2">
                About this item
              </p>
              <p className="text-[14.5px] text-[var(--color-ink)] leading-[1.7] whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          <div className="hidden sm:block mt-8">
            <WhatsAppButton href={waLink} size="lg" label={m.contactToBuy()} />
          </div>
        </div>
      </div>

      {(allProducts === undefined || related.length > 0) && (
        <RelatedSection
          heading={getCategoryLabel(product.category, locale)}
          loading={allProducts === undefined}
          items={related}
        />
      )}

      <StickyMobileCTA price={product.price} waLink={waLink} seq={product.seq} />
    </div>
  );
}
