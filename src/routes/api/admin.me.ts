import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'

export const Route = createFileRoute('/api/admin/me')({
  server: {
    handlers: {
      GET: () => {
        const raw = getCookie('dasty2-admin') ?? null
        const email = raw ? decodeURIComponent(raw) : null
        return Response.json({ email })
      },
    },
  },
})
