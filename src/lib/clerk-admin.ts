import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { auth, clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { requireClerkAdmin } from './admin-auth'

export const adminClerkVerifyFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async () => {
    const { userId } = await auth()
    if (!userId) {
      return { ok: false, error: 'not_authenticated' as const }
    }

    const admin = await requireClerkAdmin()
    if (!admin) {
      return { ok: false, error: 'not_admin' as const }
    }

    setCookie('dasty2-admin', encodeURIComponent(admin.email), {
      httpOnly: true, path: '/', maxAge: 86_400, sameSite: 'lax',
    })
    return { ok: true }
  })
