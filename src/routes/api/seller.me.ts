import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'

export const Route = createFileRoute('/api/seller/me')({
  server: {
    handlers: {
      GET: () => {
        const sellerId = getCookie('dasty2-seller') ?? null
        return Response.json({ sellerId })
      },
    },
  },
})
