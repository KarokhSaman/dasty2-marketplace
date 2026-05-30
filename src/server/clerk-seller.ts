import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { auth, clerkClient, clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getPrimaryEmail, requireClerkAdmin } from './admin-auth'
import { convexServerOptions } from './convex'

export const sellerClerkSyncFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async () => {
    const { userId, getToken } = await auth()
    if (!userId) return { ok: false, error: 'not_authenticated' as const }

    const token = await getToken()
    if (!token) return { ok: false, error: 'not_authenticated' as const }

    const sellerResult = await fetchQuery(
      api.sellers.getCurrent,
      {},
      convexServerOptions(token),
    )
      .then((seller) => ({ ok: true as const, seller }))
      .catch(() => ({ ok: false as const }))

    if (!sellerResult.ok) {
      return { ok: false, error: 'convex_auth_failed' as const }
    }

    const seller = sellerResult.seller

    if (!seller) {
      return { ok: true, needsProfile: true }
    }

    if (!seller.isActive) return { ok: false, error: 'account_inactive' as const }

    setCookie('dasty2-seller', seller._id, {
      httpOnly: true, path: '/', maxAge: 2_592_000, sameSite: 'lax',
    })
    return { ok: true, needsProfile: false, sellerId: seller._id as string }
  })

type RegisterInput = { name: string; phone: string; city: string; address: string }

export const sellerClerkRegisterFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async (ctx) => {
    const data = (ctx as unknown as { data: RegisterInput }).data
    const { userId, getToken } = await auth()
    if (!userId) return { ok: false, error: 'not_authenticated' as const }
    const token = await getToken()
    if (!token) return { ok: false, error: 'not_authenticated' as const }

    const email = await getPrimaryEmail(userId)

    const sellerResult = await fetchMutation(
      api.sellers.create,
      {
        email: email || undefined,
        name: data.name.trim(),
        phone: data.phone.trim(),
        city: data.city,
        address: data.address.trim() || undefined,
        registeredAt: new Date().toISOString(),
      },
      convexServerOptions(token),
    )
      .then((sellerId) => ({ ok: true as const, sellerId }))
      .catch(() => ({ ok: false as const }))

    if (!sellerResult.ok) {
      return { ok: false, error: 'convex_auth_failed' as const }
    }

    setCookie('dasty2-seller', sellerResult.sellerId, {
      httpOnly: true, path: '/', maxAge: 2_592_000, sameSite: 'lax',
    })
    return { ok: true, sellerId: sellerResult.sellerId as string }
  })

type DeleteInput = { sellerId: string; clerkUserId?: string }

export const deleteSellerFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async (ctx) => {
    const { sellerId, clerkUserId } = (ctx as unknown as { data: DeleteInput }).data
    const admin = await requireClerkAdmin()
    if (!admin) return { ok: false, error: 'not_admin' as const }

    if (clerkUserId) {
      try {
        await clerkClient().users.deleteUser(clerkUserId)
      } catch {
        // Clerk user may already be gone — continue with Convex deletion
      }
    }

    await fetchMutation(
      api.sellers.deleteSeller,
      { id: sellerId as Id<'sellers'> },
      convexServerOptions(admin.token),
    )

    return { ok: true }
  })
