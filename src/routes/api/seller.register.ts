import { createFileRoute } from '@tanstack/react-router'
import { setCookie } from '@tanstack/react-start/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'

export const Route = createFileRoute('/api/seller/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, name, phone, city, address } =
          (await request.json()) as {
            email?: string
            name?: string
            phone?: string
            city?: string
            address?: string
          }

        if (!email || !name || !phone || !address) {
          return Response.json({ error: 'missing_fields' }, { status: 400 })
        }

        const verified = await fetchQuery(api.otp.isVerified, {
          email: email.trim(),
        })
        if (!verified) {
          return Response.json({ error: 'session_expired' }, { status: 401 })
        }

        const sellerId = await fetchMutation(api.sellers.createWithEmail, {
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          city: city?.trim() || 'Erbil',
          address: address.trim(),
        })

        setCookie('dasty2-seller', sellerId, {
          httpOnly: true,
          path: '/',
          maxAge: 2_592_000,
          sameSite: 'lax',
        })

        return Response.json({ ok: true })
      },
    },
  },
})
