import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import HomePage from '@/pages/home'
import { CATEGORY_CONFIG } from '@/lib/categories'

const CATEGORY_KEYS = new Set(CATEGORY_CONFIG.map((c) => c.value).filter((v) => v !== 'all'))

export type HomeSearch = { category?: string; brand?: string; city?: string }

export const Route = createFileRoute('/_public/')({
  // ?category=Stroller&brand=Nuna&city=Erbil,Duhok — keeps the filters on refresh
  // and in shared links.
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    category:
      typeof search.category === 'string' && CATEGORY_KEYS.has(search.category)
        ? search.category
        : undefined,
    brand: typeof search.brand === 'string' && search.brand.trim() ? search.brand.trim() : undefined,
    city: typeof search.city === 'string'
      ? [...new Set(search.city.split(',').map((c) => c.trim()).filter(Boolean))].join(',') || undefined
      : undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category }),
  // Prefetch the (non-paginated) featured products, and whether store products
  // exist (it decides if the "Stores" filter shows), so both are in the SSR HTML
  // and the filter row appears complete at once. The paginated feed loads
  // client-side.
  loader: async ({ context, deps }) => {
    await Promise.all([
      // brands that real products have, so the Brand filter is complete at once
      context.queryClient
        .ensureQueryData(
          convexQuery(api.products.listBrands, deps.category ? { category: deps.category } : {}),
        )
        .catch(() => {}),
      context.queryClient
        .ensureQueryData(convexQuery(api.products.getFeatured, {}))
        .catch(() => {}),
      context.queryClient
        .ensureQueryData(convexQuery(api.products.hasStoreProducts, {}))
        .catch(() => {}),
    ])
  },
  component: HomePage,
})
