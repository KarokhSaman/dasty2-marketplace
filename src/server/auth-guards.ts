import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'

export const requireSellerFn = createServerFn({ method: 'GET' }).handler(() => {
  const sellerId = getCookie('dasty2-seller') ?? null
  if (!sellerId) {
    throw redirect({ to: '/seller/login' })
  }
  return { sellerId }
})

export const requireAdminFn = createServerFn({ method: 'GET' }).handler(() => {
  const raw = getCookie('dasty2-admin') ?? null
  if (!raw) {
    throw redirect({ to: '/admin/login' })
  }
  return { adminEmail: decodeURIComponent(raw) }
})
