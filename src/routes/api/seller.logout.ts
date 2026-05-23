import { createFileRoute } from '@tanstack/react-router'
import { deleteCookie } from '@tanstack/react-start/server'

export const Route = createFileRoute('/api/seller/logout')({
  server: {
    handlers: {
      POST: () => {
        deleteCookie('dasty2-seller', { path: '/' })
        return Response.json({ ok: true })
      },
    },
  },
})
