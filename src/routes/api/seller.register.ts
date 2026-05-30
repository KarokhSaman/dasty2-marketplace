import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/seller/register')({
  server: {
    handlers: {
      POST: () =>
        Response.json({ error: 'clerk_auth_required' }, { status: 410 }),
    },
  },
})
