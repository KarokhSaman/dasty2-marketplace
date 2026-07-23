import { createFileRoute } from '@tanstack/react-router'
import { ConvexClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/cleanup-featured')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Check authorization header
          const authHeader = request.headers.get('Authorization')
          const expectedSecret = process.env.CLEANUP_SECRET || 'dev-secret'
          const expectedAuth = `Bearer ${expectedSecret}`

          if (authHeader !== expectedAuth && process.env.NODE_ENV === 'production') {
            return Response.json(
              { error: 'Unauthorized' },
              { status: 401 }
            )
          }

          const client = new ConvexClient(process.env.VITE_CONVEX_URL!)
          const result = await client.mutation(api.products.cleanupExpiredFeatured, {})

          return Response.json({
            success: true,
            message: `Unfeatured ${result.unfeatureCount} expired products`,
            unfeatureCount: result.unfeatureCount,
            date: result.today,
          })
        } catch (error) {
          console.error('[Cleanup API] Error:', error)
          return Response.json(
            {
              error: 'Cleanup failed',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      },
    },
  },
})
