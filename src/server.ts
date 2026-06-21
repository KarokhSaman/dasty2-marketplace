import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/paraglide/server'
import { hardenResponse } from '@/lib/security'
import { ConvexClient } from 'convex/browser'

const fetch = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request): Promise<Response> {
    // Pass the *original* request to the handler — TanStack Router's `rewrite`
    // option de-localizes the URL itself, so handing it the middleware's
    // already-de-localized request would cause a rewrite loop.
    // (See paraglideMiddleware docs.)
    const response = await paraglideMiddleware(request, () => fetch(request))
    return hardenResponse(request, response)
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Run cleanup of expired featured products daily
    try {
      console.log('[Cron] Starting cleanup of expired featured products...')

      const client = new ConvexClient(env.VITE_CONVEX_URL)
      const result = await client.mutation('products:cleanupExpiredFeatured', {})

      console.log(`[Cron] ✓ Unfeatured ${result.unfeatureCount} products`)
    } catch (error) {
      console.error('[Cron] ✗ Cleanup failed:', error)
    }
  },
}
