import { createFileRoute } from '@tanstack/react-router'
import { setCookie } from '@tanstack/react-start/server'
import { fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/lib/convex'
import { secureCookieOptions } from '@/lib/security'
import { SESSION_COOKIE } from '@/lib/session'

type MockRole = 'seller' | 'admin'
type Body = { role?: string }

export const Route = createFileRoute('/api/auth/mock-login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Vite replaces this at build time, leaving no production HTTP entry
        // point even if someone later misconfigures the backend environment.
        if (!import.meta.env.DEV) {
          return Response.json({ error: 'not_found' }, { status: 404 })
        }

        let body: Body
        try {
          body = (await request.json()) as Body
        } catch {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }

        if (body.role !== 'seller' && body.role !== 'admin') {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }
        const role: MockRole = body.role

        try {
          const result = await fetchAction(
            api.authActions.mockLogin,
            { role },
            convexServerOptions(),
          )
          setCookie(SESSION_COOKIE, result.jwt, {
            ...secureCookieOptions(request),
            maxAge: 2_592_000,
          })
          return Response.json({ ok: true, role: result.role })
        } catch (error) {
          console.error('Development mock login failed', error)
          return Response.json({ error: 'mock_login_failed' }, { status: 503 })
        }
      },
    },
  },
})
