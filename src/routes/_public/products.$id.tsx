import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import ProductDetailPage from '@/pages/product-detail'
import { previewImageUrl } from '@/lib/images'
import { priceInfo } from '@/convex/discount'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import { getCityLabel } from '@/lib/cities'
import { getProductCache } from '@/lib/productCache'

export const Route = createFileRoute('/_public/products/$id')({
  // Prefetch the product into the React Query cache (and SSR it) before the
  // component renders, so a link/tab navigation lands on real content instead
  // of a skeleton — and `defaultPreload: 'intent'` warms it on hover/touch.
  loader: async ({ context, params }) => {
    const query = convexQuery(api.products.getPublicById, { id: params.id })
    // Opened from a product card: the card already handed over the product,
    // so show the page at once and fetch the fresh copy in the background
    // (waiting here left the screen blank for a moment). Direct links and the
    // server render still wait, so link previews get the real data.
    if (typeof window !== 'undefined') {
      const seed = getProductCache(params.id)
      if (seed) {
        void context.queryClient.prefetchQuery(query)
        return seed
      }
    }
    return await context.queryClient.ensureQueryData(query)
  },
  head: ({ loaderData }) => {
    // Drives the link-preview card in WhatsApp and similar apps.
    const product = loaderData

    const locale = getLocale()
    const conditionLabel =
      product?.condition === 'new'
        ? m.conditionNew()
        : product?.condition === 'likenew'
          ? m.conditionLikeNew()
          : m.conditionUsed()
    const title = product?.title || 'Product - Mndallan'
    // In Kurdish/Arabic the line is right-to-left, which flips "115,000 IQD" and
    // "26-0006". A left-to-right mark on each side keeps those pieces reading
    // left to right.
    const ltr = (text: string) => (locale === 'en' ? text : `\u200E${text}\u200E`)
    const description = [
      conditionLabel,
      product?.city ? (getCityLabel(product.city, locale) ?? product.city) : null,
      product ? ltr(`${priceInfo(product).price.toLocaleString('en-US')} IQD`) : null,
      product?.seq ? `${m.productCode()} ${ltr(product.seq)}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const photos = product?.photos ?? []
    const mainPhoto = photos[product?.mainPhotoIndex ?? 0] ?? photos[0]
    const image = previewImageUrl(mainPhoto)

    return {
      meta: [
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'product' },
        { property: 'og:site_name', content: 'Mndallan' },
        ...(image ? [{ property: 'og:image', content: image }] : []),
        { name: 'description', content: description },
      ],
    }
  },
  component: ProductDetailPage,
})
