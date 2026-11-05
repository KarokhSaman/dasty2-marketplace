import { createFileRoute, redirect } from '@tanstack/react-router'
import SellerLoginPage from '@/pages/seller-login'
import { loadCurrentSeller } from '@/lib/route-guards'
import { sellerNextPath } from '@/lib/sellerNext'

export const Route = createFileRoute('/_public/seller/login')({
  // Already signed in? Skip the OTP form and go straight to where they were going.
  beforeLoad: async ({ context, location }) => {
    if (!context.token) return
    const seller = await loadCurrentSeller(context.queryClient).catch(() => null)
    if (seller?.isActive) throw redirect({ href: sellerNextPath((location.search as { next?: string }).next) })
  },
  component: SellerLoginPage,
})
