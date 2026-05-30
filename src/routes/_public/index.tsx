import { createFileRoute } from '@tanstack/react-router'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import HomePage from '@/src/pages/home'

export const Route = createFileRoute('/_public/')({
  // Prefetch the (non-paginated) featured products so they're SSR'd into the
  // homepage HTML and warmed on intent. The paginated feed loads client-side.
  loader: async ({ context }) => {
    await context.queryClient
      .ensureQueryData(convexQuery(api.products.getFeatured, {}))
      .catch(() => {})
  },
  component: HomePage,
})
