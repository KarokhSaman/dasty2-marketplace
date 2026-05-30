/// <reference types="vite/client" />
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient } from 'convex/react'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '@/src/paraglide/runtime'

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!CONVEX_URL) {
    throw new Error('VITE_CONVEX_URL env var is missing')
  }

  const convex = new ConvexReactClient(CONVEX_URL, {
    unsavedChangesWarning: false,
  })
  // Single-roundtrip SSR fetches. The default "consistent" mode does a 2-roundtrip
  // timestamped fetch that doesn't resolve reliably in the Worker dev runtime,
  // leaving loader-prefetched queries unhydrated (skeleton SSR). Our pages don't
  // depend on cross-query SSR consistency, so the faster single fetch is correct.
  const convexQueryClient = new ConvexQueryClient(convex, {
    dangerouslyUseInconsistentQueriesDuringSSR: true,
  })

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultViewTransition: true,
    context: { queryClient, convexClient: convex, convexQueryClient },
    scrollRestoration: true,
    // The Convex provider lives in __root.tsx (ConvexProviderWithClerk) which wraps
    // the whole app — no second ConvexProvider needed here.
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
