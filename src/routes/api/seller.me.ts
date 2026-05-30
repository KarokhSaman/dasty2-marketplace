import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@clerk/tanstack-react-start/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/src/server/convex'

export const Route = createFileRoute('/api/seller/me')({
  server: {
    handlers: {
      GET: async () => {
        const { userId, getToken } = await auth()
        if (!userId) return Response.json({ sellerId: null })

        const token = await getToken()
        if (!token) return Response.json({ sellerId: null })

        const sellerResult = await fetchQuery(
          api.sellers.getCurrent,
          {},
          convexServerOptions(token),
        )
          .then((seller) => ({ ok: true as const, seller }))
          .catch(() => ({ ok: false as const }))

        if (!sellerResult.ok) {
          return Response.json({
            sellerId: null,
            error: 'convex_auth_failed',
          })
        }

        return Response.json({ sellerId: sellerResult.seller?._id ?? null })
      },
    },
  },
})
