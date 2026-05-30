import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, setCookie } from '@tanstack/react-start/server'
import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { requireClerkAdmin } from './admin-auth'
import { convexServerOptions } from './convex'

export const requireSellerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, getToken } = await auth()
  if (!userId) {
    throw redirect({ to: '/seller/login' })
  }

  const token = await getToken()
  if (!token) {
    deleteCookie('dasty2-seller', { path: '/' })
    throw redirect({ to: '/seller/login' })
  }

  const seller = await fetchQuery(
    api.users.getCurrentSeller,
    {},
    convexServerOptions(token),
  )
  if (!seller || !seller.isActive) {
    deleteCookie('dasty2-seller', { path: '/' })
    throw redirect({ to: '/seller/login' })
  }

  setCookie('dasty2-seller', seller._id, {
    httpOnly: true, path: '/', maxAge: 2_592_000, sameSite: 'lax',
  })
  return { sellerId: seller._id }
})

export const requireAdminFn = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireClerkAdmin()
  if (!admin) {
    deleteCookie('dasty2-admin', { path: '/' })
    throw redirect({ to: '/admin/login' })
  }

  setCookie('dasty2-admin', encodeURIComponent(admin.email), {
    httpOnly: true, path: '/', maxAge: 86_400, sameSite: 'lax',
  })
  return { adminEmail: admin.email }
})
