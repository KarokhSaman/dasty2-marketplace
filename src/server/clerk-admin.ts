import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { auth, clerkClient, clerkMiddleware } from '@clerk/tanstack-react-start/server'

const ADMIN_EMAILS = ['karokh.saman.aziz@gmail.com', 'soma.karam.a@gmail.com']

export const adminClerkVerifyFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async () => {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'not_authenticated' as const }

    const clerkUser = await clerkClient().users.getUser(userId)
    const email = clerkUser.emailAddresses
      .find(e => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? ''

    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      return { ok: false, error: 'not_admin' as const }
    }

    setCookie('dasty2-admin', encodeURIComponent(email), {
      httpOnly: true, path: '/', maxAge: 86_400, sameSite: 'lax',
    })
    return { ok: true }
  })
