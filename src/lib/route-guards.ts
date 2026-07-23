import { convexQuery } from '@convex-dev/react-query'
import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/convex/_generated/api'

export async function loadCurrentSeller(queryClient: QueryClient) {
  return await queryClient.ensureQueryData(convexQuery(api.users.getCurrentSeller, {}))
}

export async function requireSeller(queryClient: QueryClient) {
  const seller = await loadCurrentSeller(queryClient)
  if (!seller || !seller.isActive) {
    throw redirect({ to: '/seller/login' })
  }
  return { seller }
}

export async function requireAdmin(queryClient: QueryClient) {
  const user = await queryClient.ensureQueryData(
    convexQuery(api.users.getCurrent, {}),
  )
  if (
    !user ||
    !user.isActive ||
    (user.role !== 'admin' && user.role !== 'super_admin')
  ) {
    throw redirect({ to: '/admin/login' })
  }
  return { user }
}
