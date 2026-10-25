import { convexQuery } from '@convex-dev/react-query'
import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/convex/_generated/api'

export async function loadCurrentSeller(queryClient: QueryClient) {
  return await queryClient.ensureQueryData(convexQuery(api.users.getCurrentSeller, {}))
}

// `token` is the session cookie (from the root beforeLoad). In the browser the
// Convex websocket may not have sent it yet, so a `null` seller there doesn't
// mean "logged out" — SellerShell waits for auth instead. The server-side
// check (authenticated SSR client) is authoritative.
export async function requireSeller(
  queryClient: QueryClient,
  token?: string | null,
  { toAddAfterProfile = false }: { toAddAfterProfile?: boolean } = {},
) {
  const seller = await loadCurrentSeller(queryClient)
  if (!seller && token && typeof window !== 'undefined') {
    return { seller: null }
  }
  if (!seller || !seller.isActive) {
    throw redirect({ to: '/seller/login' })
  }
  // Enforce profile completion — if seller has no name, redirect to complete profile
  if (!seller.name || !seller.name.trim()) {
    throw redirect({
      to: '/seller/complete-profile',
      search: (toAddAfterProfile ? { next: 'add' } : {}) as never,
    })
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
