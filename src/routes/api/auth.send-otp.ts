import { createFileRoute } from '@tanstack/react-router'
import { fetchAction } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/lib/convex'

type Body = {
  methodName?: string
  phoneNumber?: string
  language?: string
}

const METHODS = new Set(['whatsapp-otp', 'telegram-otp', 'sms-otp'])
const LANGS = new Set(['en', 'ar', 'ckb'])

// Real client IPv4 for VerifySpeed fraud/method checks. On Cloudflare the
// canonical source is CF-Connecting-IP; fall back to the first X-Forwarded-For.
function clientIpv4(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.split(',')[0].trim()
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return '0.0.0.0'
}

export const Route = createFileRoute('/api/auth/send-otp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body
        try {
          body = (await request.json()) as Body
        } catch {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }

        const methodName = body.methodName ?? ''
        const phoneNumber = (body.phoneNumber ?? '').trim()
        const language = LANGS.has(body.language ?? '') ? body.language : 'en'

        if (!METHODS.has(methodName) || !phoneNumber) {
          return Response.json({ error: 'bad_request' }, { status: 400 })
        }

        try {
          const res = await fetchAction(
            api.authActions.sendOtp,
            {
              methodName: methodName as 'whatsapp-otp' | 'telegram-otp' | 'sms-otp',
              phoneNumber,
              language: language as 'en' | 'ar' | 'ckb',
              clientIpv4: clientIpv4(request),
            },
            convexServerOptions(),
          )
          return Response.json({
            verificationKey: res.verificationKey,
            methodName: res.methodName,
          })
        } catch (err) {
          console.error('VerifySpeed send failed', err)
          return Response.json(
            { error: 'send_failed' },
            { status: 502 },
          )
        }
      },
    },
  },
})
