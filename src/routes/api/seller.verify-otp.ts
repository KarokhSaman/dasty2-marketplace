import { createFileRoute } from '@tanstack/react-router'
import { setCookie } from '@tanstack/react-start/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { secureCookieOptions } from '@/src/server/security'

export const Route = createFileRoute('/api/seller/verify-otp')({
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

        const result = await fetchMutation(api.otp.verify, {
          email: email.trim(),
          code: code.trim(),
        })

        if (!result.ok) {
          const code =
            result.reason === 'expired' ? 'code_expired' : 'code_invalid'
          return Response.json({ error: code }, { status: 401 })
        }

        const seller = await fetchQuery(api.sellers.getByEmail, {
          email: email.trim(),
        })

        if (!seller) {
          return Response.json({ ok: true, needsProfile: true })
        }

        if (!seller.isActive) {
          return Response.json(
            { error: 'account_inactive' },
            { status: 403 },
          )
        }

        setCookie('dasty2-seller', seller._id, {
          ...secureCookieOptions(request),
          maxAge: 2_592_000,
        })

        return Response.json({ ok: true, needsProfile: false })
      },
    },
  },
})
