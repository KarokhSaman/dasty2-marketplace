import { createFileRoute, Outlet } from '@tanstack/react-router'
import SellerShell from '@/components/seller/SellerShell'
import { requireSeller } from '@/lib/route-guards'

export const Route = createFileRoute('/_public/_seller')({
  beforeLoad: async ({ context, location }) => {
    const { seller } = await requireSeller(context.queryClient, context.token, {
      // Not logged in or no profile yet: back to this page afterwards.
      next: location.pathname === '/seller' ? undefined : location.href,
    })
    return { sellerId: seller?._id }
  },
  component: SellerLayout,
})

function SellerLayout() {
  return (
    <SellerShell>
      <Outlet />
    </SellerShell>
  )
}
