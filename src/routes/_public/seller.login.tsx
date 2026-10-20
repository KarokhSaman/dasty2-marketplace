import { createFileRoute, redirect } from '@tanstack/react-router'
import SellerLoginPage from '@/pages/seller-login'
import { loadCurrentSeller } from '@/lib/route-guards'

export const Route = createFileRoute('/_public/seller/login')({
  // Already signed in? Skip the OTP form and go straight to the dashboard.
  beforeLoad: async ({ context }) => {
    if (!context.token) return
    const seller = await loadCurrentSeller(context.queryClient).catch(() => null)
    if (seller?.isActive) throw redirect({ to: '/seller' })
  },
  component: SellerLoginPage,
})
