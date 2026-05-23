import { createFileRoute } from '@tanstack/react-router'
import { deleteCookie } from '@tanstack/react-start/server'

export const Route = createFileRoute('/api/admin/logout')({
  server: {
    handlers: {
      POST: () => {
        deleteCookie('dasty2-admin', { path: '/' })
        return Response.json({ ok: true })
      },
    },
  },
})
