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
  component: ProductDetailPage,
})
