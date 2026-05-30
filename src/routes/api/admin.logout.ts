import { createFileRoute } from '@tanstack/react-router'
import { deleteCookie } from '@tanstack/react-start/server'
import { secureCookieOptions } from '@/lib/security'

export const Route = createFileRoute('/api/admin/logout')({
  server: {
    handlers: {
      POST: ({ request }) => {
        deleteCookie('dasty2-admin', secureCookieOptions(request))
        return Response.json({ ok: true })
      },
    },
  },
})
