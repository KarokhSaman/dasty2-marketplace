import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { auth, clerkClient, clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export const sellerClerkSyncFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async () => {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'not_authenticated' as const }

    const seller = await fetchQuery(
      api.sellers.getByClerkId,
      { clerkUserId: userId },
      { url: process.env.CONVEX_URL },
    )

    if (!seller) {
      const clerkUser = await clerkClient().users.getUser(userId)
      const email = clerkUser.emailAddresses
        .find(e => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? ''
      const bySeller = email
        ? await fetchQuery(
            api.sellers.getByEmail,
            { email },
            { url: process.env.CONVEX_URL },
          )
        : null
      if (bySeller) {
        await fetchMutation(
          api.sellers.patchClerkId,
          { id: bySeller._id, clerkUserId: userId },
          { url: process.env.CONVEX_URL },
        )
        if (!bySeller.isActive)
          return { ok: false, error: 'account_inactive' as const }
        setCookie('dasty2-seller', bySeller._id, {
          httpOnly: true, path: '/', maxAge: 2_592_000, sameSite: 'lax',
        })
        return { ok: true, needsProfile: false, sellerId: bySeller._id as string }
      }
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
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'not_authenticated' as const }

    const clerkUser = await clerkClient().users.getUser(userId)
    const email = clerkUser.emailAddresses
      .find(e => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? ''

    const sellerId = await fetchMutation(
      api.sellers.create,
      {
        clerkUserId: userId,
        email: email || undefined,
        name: data.name.trim(),
        phone: data.phone.trim(),
        city: data.city,
        address: data.address.trim() || undefined,
        registeredAt: new Date().toISOString(),
      },
      { url: process.env.CONVEX_URL },
    )

    setCookie('dasty2-seller', sellerId, {
      httpOnly: true, path: '/', maxAge: 2_592_000, sameSite: 'lax',
    })
    return { ok: true, sellerId: sellerId as string }
  })

type DeleteInput = { sellerId: string; clerkUserId?: string }

export const deleteSellerFn = createServerFn({ method: 'POST' })
  .middleware([clerkMiddleware()])
  .handler(async (ctx) => {
    const { sellerId, clerkUserId } = (ctx as unknown as { data: DeleteInput }).data

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
      { url: process.env.CONVEX_URL },
    )

    return { ok: true }
  })
