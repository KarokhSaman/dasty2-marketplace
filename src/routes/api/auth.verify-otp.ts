import { createFileRoute } from '@tanstack/react-router'
import { setCookie } from '@tanstack/react-start/server'
import { fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/lib/convex'
import { secureCookieOptions } from '@/lib/security'
import { SESSION_COOKIE } from '@/lib/session'

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

        // 30-day httpOnly session cookie carrying the RS256 JWT.
        setCookie(SESSION_COOKIE, res.jwt, {
          ...secureCookieOptions(request),
          maxAge: 2_592_000,
        })

        return Response.json({ ok: true, role: res.role })
      },
    },
  },
})
