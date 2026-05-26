import { createFileRoute } from '@tanstack/react-router'
import { deleteCookie } from '@tanstack/react-start/server'
import { secureCookieOptions } from '@/src/server/security'

export const Route = createFileRoute('/api/seller/logout')({
  server: {
    handlers: {
      POST: ({ request }) => {
        deleteCookie('dasty2-seller', secureCookieOptions(request))
        return Response.json({ ok: true })
      },
    },
  },
})
