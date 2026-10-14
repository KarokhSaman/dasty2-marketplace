import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import ProductDetailPage from '@/pages/product-detail'

export const Route = createFileRoute('/_public/products/$id')({
  // Prefetch the product into the React Query cache (and SSR it) before the
  // component renders, so a link/tab navigation lands on real content instead
  // of a skeleton — and `defaultPreload: 'intent'` warms it on hover/touch.
  loader: async ({ context, params }) => {
    await context.queryClient
      .ensureQueryData(
        convexQuery(api.products.getPublicById, {
          id: params.id,
        }),
      )
  },
  head: ({ matches, context }) => {
    // Get product data from React Query cache for meta tags
    const product = context.queryClient.getQueryData(
      convexQuery(api.products.getPublicById, {
        id: matches[matches.length - 1]?.params.id,
      }).queryKey
    )

    const conditionLabel = product?.condition === 'new' ? 'New' : 'Used'
    const title = product?.title || 'Product - Mndallan'
    const description = `${product?.title}\n${product?.city}\n${conditionLabel}\n${product?.price?.toLocaleString()} IQD`

    return {
      meta: [
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'product' },
        { property: 'og:site_name', content: 'Mndallan' },
        { name: 'description', content: description },
      ],
    }
  },
  component: ProductDetailPage,
})
