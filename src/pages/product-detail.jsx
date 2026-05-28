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
  Gallery,
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
function EyeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function ClockIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function ShareIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
    </svg>
  );
}
function ShieldIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

// ── Format a posted date in the active locale ──────────────
function formatDate(iso, locale) {
  if (!iso) return "";
  try {
    const tag = locale === "en" ? "en-GB" : locale;
    return new Date(iso).toLocaleDateString(tag, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(iso).slice(0, 10);
  }
}

// ── Floating controls layered over the gallery ─────────────
function GalleryOverlay({ onBack, shareTitle, shareUrl }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: shareTitle, url: shareUrl }); } catch { /* dismissed */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  }

  const btn = "pointer-events-auto inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/35 text-white ring-1 ring-white/15 backdrop-blur-md transition-transform active:scale-90 hover:bg-black/45";

  return (
    <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-2 pointer-events-none">
      <button type="button" onClick={onBack} aria-label={m.back()} className={btn}>
        <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex-1 flex justify-center">
        {copied && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 text-white text-[12px] font-semibold backdrop-blur-md scale-in">
            <CheckIcon className="w-3.5 h-3.5" /> {m.linkCopied()}
          </span>
        )}
      </div>

      <button type="button" onClick={onShare} aria-label={m.shareLabel()} className={btn}>
        {copied ? <CheckIcon className="w-4 h-4" /> : <ShareIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Seller attribution card ────────────────────────────────
function SellerCard({ name, city }) {
  if (!name) return null;
  const initial = name.trim().charAt(0).toUpperCase() || "•";
  return (
    <div className="surface-card p-3.5 flex items-center gap-3 mb-1">
      <div className="w-11 h-11 rounded-full bg-[var(--color-cream-deep)] text-[var(--color-ink-soft)] font-display text-lg flex items-center justify-center shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--color-ink-fade)]">{m.listedBy()}</p>
        <p className="text-[15px] font-semibold text-[var(--color-ink)] truncate">{name}</p>
      </div>
      {city && (
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-ink-soft)] shrink-0">
          <PinIcon className="w-3.5 h-3.5 text-[var(--color-ink-fade)]" />
          {city}
        </span>
      )}
    </div>
  );
}

// ── Image placeholder (related cards) ──────────────────────
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
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] overflow-hidden hover:border-[var(--color-ember-200)] hover:shadow-[0_18px_36px_-22px_rgba(11,12,15,0.22)] transition-all duration-300 active:scale-[0.98]">
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
    <div className="max-w-5xl mx-auto">
      <Skeleton.Bar w="5rem" />
      <div className="grid md:grid-cols-[1.05fr_1fr] gap-6 md:gap-10 mt-4">
        <Skeleton.Block className="aspect-square rounded-3xl" />
        <div className="space-y-4 md:pt-2">
          <Skeleton.Bar w="30%" />
          <Skeleton.Bar w="80%" h="1.6rem" />
          <Skeleton.Bar w="40%" h="2.2rem" />
          <Skeleton.Block className="h-16 rounded-2xl" />
          <Skeleton.Bar w="60%" />
        </div>
      </div>
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

// ── Sticky mobile CTA ─────────────────────────────────────
function StickyMobileCTA({ price, waLink, seq }) {
  return (
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md surface-frost rounded-[1.75rem] border border-[var(--color-hairline)] shadow-[0_18px_44px_-20px_rgba(11,12,15,0.22)] p-2.5 flex items-center gap-3">
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
  const isNew = product.condition === "new";
  const cityLabel = product.city ? (getCityLabel(product.city, locale) ?? product.city) : null;
  const categoryLabel = getCategoryLabel(product.category, locale);
  const posted = formatDate(product.dateAdded, locale);
  const views = typeof product.views === "number" ? product.views : 0;

  return (
    <div className="max-w-5xl mx-auto pb-28 sm:pb-12">
      <div className="grid md:grid-cols-[1.05fr_1fr] gap-5 md:gap-10 -mt-3 sm:mt-0 mb-10 md:mb-14 fade-up">
        <div className="relative -mx-4 sm:mx-0 md:self-start">
          <Gallery
            photos={photos}
            alt={product.title}
            rounded="rounded-none sm:rounded-[1.5rem]"
            heroTransitionName={`vt-${product._id}`}
          />
          <GalleryOverlay
            onBack={() => router.history.back()}
            shareTitle={product.title}
            shareUrl={productUrl}
          />
        </div>

        <div className="md:pt-1">
          {/* Category eyebrow */}
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-fade)] mb-2">
            {categoryLabel}
          </p>

          {/* Title */}
          <h1 className="font-display text-[26px] sm:text-[32px] text-[var(--color-ink)] mb-3 leading-[1.12]">
            {product.title}
          </h1>

          {/* Quick chips */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Chip tone={isNew ? "success" : "warning"} dot>
              {isNew ? m.badgeNew() : m.badgeUsed()}
            </Chip>
            {cityLabel && (
              <Chip tone="neutral" leadingIcon={<PinIcon className="w-3 h-3" />}>
                {cityLabel}
              </Chip>
            )}
            {product.featured && (
              <Chip tone="brand" leadingIcon={<StarIcon className="w-2.5 h-2.5" />}>
                {m.featured()}
              </Chip>
            )}
          </div>

          {/* Price */}
          <div className="mb-3">
            <PriceTag amount={product.price} size="xl" />
          </div>

          {/* Metadata: views · posted · product code */}
          <div className="flex items-center gap-2.5 flex-wrap text-[12px] text-[var(--color-ink-fade)] mb-5">
            {views > 0 && (
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="w-3.5 h-3.5" />
                {m.viewsCount({ count: views })}
              </span>
            )}
            {views > 0 && posted && <span aria-hidden>·</span>}
            {posted && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {m.postedLabel()} {posted}
              </span>
            )}
            {product.seq && <span aria-hidden>·</span>}
            {product.seq && (
              <span className="inline-flex items-center gap-1">
                {m.productCode()}
                <span className="font-mono font-semibold text-[var(--color-ink-soft)] tracking-wide">{product.seq}</span>
              </span>
            )}
          </div>

          {/* Seller */}
          <SellerCard name={product.sellerName} city={cityLabel} />

          {/* Description */}
          {product.description && (
            <div className="mt-6 pt-5 border-t border-[var(--color-hairline)]">
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--color-ink-fade)] mb-2">
                {m.aboutItem()}
              </p>
              <p className="text-[14.5px] text-[var(--color-ink)] leading-[1.7] whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Safety note */}
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-[var(--color-cream)] border border-[var(--color-hairline)] p-3.5">
            <span className="shrink-0 mt-0.5 text-[var(--color-jade-600)]">
              <ShieldIcon className="w-4 h-4" />
            </span>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">{m.safetyNote()}</p>
          </div>

          {/* Desktop CTA */}
          <div className="hidden sm:block mt-6">
            <WhatsAppButton href={waLink} size="lg" label={m.contactToBuy()} />
          </div>
        </div>
      </div>

      {(allProducts === undefined || related.length > 0) && (
        <RelatedSection
          heading={categoryLabel}
          loading={allProducts === undefined}
          items={related}
        />
      )}

      <StickyMobileCTA price={product.price} waLink={waLink} seq={product.seq} />
    </div>
  );
}
