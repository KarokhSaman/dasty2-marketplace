import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { fetchMutation } from 'convex/nextjs'
import { Resend } from 'resend'
import { api } from '@/convex/_generated/api'
import { logInfo, logWarning } from '@/src/server/security'

const ADMIN_EMAILS = ['karokh.saman.aziz@gmail.com', 'soma.karam.a@gmail.com']

export const Route = createFileRoute('/api/admin/send-otp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email } = (await request.json()) as { email?: string }

        if (!email?.trim()) {
          return Response.json({ error: 'email_required' }, { status: 400 })
        }

        if (!ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
          return Response.json({ error: 'not_admin' }, { status: 403 })
        }

        const code = await fetchMutation(api.otp.create, {
          email: email.trim(),
        })

        logInfo('admin_otp_created', { email: email.trim() })

        if (env.RESEND_API_KEY) {
          try {
            const resend = new Resend(env.RESEND_API_KEY)
            await resend.emails.send({
              from: 'Dasty2 Admin <noreply@dasty2mndalan.com>',
              to: email.trim(),
              subject: 'Admin login code — Dasty2 Mndalan',
              html: `
                <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
                  <h2 style="color:#e11d48;margin-bottom:8px">Dasty2 Admin</h2>
                  <p style="color:#555;margin-bottom:24px">Your admin verification code:</p>
                  <div style="font-size:40px;font-weight:bold;letter-spacing:8px;color:#111;background:#f9f9f9;border-radius:12px;padding:24px;text-align:center">
                    ${code}
                  </div>
                  <p style="color:#999;font-size:13px;margin-top:24px">Valid for 10 minutes.</p>
                </div>
              `,
            })
          } catch (err) {
            logWarning('resend_error', {
              message: err instanceof Error ? err.message : String(err),
            })
          }
        }

        return Response.json({ ok: true })
      },
    },
  },
})
