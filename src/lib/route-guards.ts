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
