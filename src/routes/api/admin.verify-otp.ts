import { createFileRoute } from '@tanstack/react-router'
import { setCookie } from '@tanstack/react-start/server'
import { fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { secureCookieOptions } from '@/src/server/security'

const ADMIN_EMAILS = ['karokh.saman.aziz@gmail.com', 'soma.karam.a@gmail.com']

export const Route = createFileRoute('/api/admin/verify-otp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, code } = (await request.json()) as {
          email?: string
          code?: string
        }

        if (!email?.trim() || !code?.trim()) {
          return Response.json({ error: 'missing_fields' }, { status: 400 })
        }

        if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
          return Response.json({ error: 'not_admin' }, { status: 403 })
        }

        const result = await fetchMutation(api.otp.verify, {
          email: email.trim(),
          code: code.trim(),
        }, { url: process.env.CONVEX_URL })

        if (!result.ok) {
          const code =
            result.reason === 'expired' ? 'code_expired' : 'code_invalid'
          return Response.json({ error: code }, { status: 401 })
        }

        setCookie('dasty2-admin', encodeURIComponent(email.trim()), {
          ...secureCookieOptions(request),
          maxAge: 86_400,
        })

        return Response.json({ ok: true })
      },
    },
  },
})
