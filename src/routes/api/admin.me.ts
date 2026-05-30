import { createFileRoute } from '@tanstack/react-router'
import { requireClerkAdmin } from '@/src/server/admin-auth'

export const Route = createFileRoute('/api/admin/me')({
  server: {
    handlers: {
      GET: async () => {
        const admin = await requireClerkAdmin()
        return Response.json({ email: admin?.email ?? null })
      },
    },
  },
})
