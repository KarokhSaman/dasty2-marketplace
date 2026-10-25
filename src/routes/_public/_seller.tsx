import { createFileRoute, Outlet } from '@tanstack/react-router'
import SellerShell from '@/components/seller/SellerShell'
import { requireSeller } from '@/lib/route-guards'

export const Route = createFileRoute('/_public/_seller')({
  beforeLoad: async ({ context, location }) => {
    const { seller } = await requireSeller(context.queryClient, context.token, {
      // Sell now without a profile yet: back to the add form once it's saved.
      toAddAfterProfile: location.pathname === '/seller/add',
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
