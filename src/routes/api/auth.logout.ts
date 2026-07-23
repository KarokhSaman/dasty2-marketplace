import { createFileRoute } from '@tanstack/react-router'
import { deleteCookie } from '@tanstack/react-start/server'
import { secureCookieOptions } from '@/lib/security'
import { SESSION_COOKIE } from '@/lib/session'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: ({ request }) => {
        deleteCookie(SESSION_COOKIE, secureCookieOptions(request))
        return Response.json({ ok: true })
      },
    },
  },
})
