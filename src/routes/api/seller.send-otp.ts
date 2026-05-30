import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/seller/send-otp')({
  server: {
    handlers: {
      POST: () =>
        Response.json({ error: 'clerk_auth_required' }, { status: 410 }),
    },
  },
})
