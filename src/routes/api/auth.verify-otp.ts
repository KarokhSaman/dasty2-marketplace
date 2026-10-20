import { createFileRoute } from '@tanstack/react-router'
import { fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/lib/convex'
import { setSessionCookie } from '@/lib/session.server'

type Body = { code?: string; verificationKey?: string }

export const Route = createFileRoute('/api/auth/verify-otp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body
        try {
          body = (await request.json()) as Body
        } catch {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }

        const code = (body.code ?? '').trim()
        const verificationKey = (body.verificationKey ?? '').trim()
        if (!code || !verificationKey) {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }

        let res
        try {
          res = await fetchAction(
            api.authActions.verifyOtp,
            { code, verificationKey },
            convexServerOptions(),
          )
        } catch (err) {
          console.error('VerifySpeed verification failed', err)
          return Response.json(
            { ok: false, errorCode: 'VERIFY_FAILED' },
            { status: 502 },
          )
        }

        if (!res.ok || !res.jwt) {
          return Response.json({
            ok: false,
            errorCode: res.errorCode ?? 'OTP_INVALID',
          })
        }

        // Long-lived httpOnly session cookie carrying the RS256 JWT (see session.ts).
        setSessionCookie(request, res.jwt)

        return Response.json({ ok: true, role: res.role })
      },
    },
  },
})
