import { createFileRoute, Outlet } from '@tanstack/react-router'
import SellerShell from '@/components/seller/SellerShell'
import { requireSeller } from '@/lib/route-guards'

export const Route = createFileRoute('/_seller')({
  beforeLoad: async ({ context }) => {
    const { seller } = await requireSeller(context.queryClient)
    return { sellerId: seller._id }
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
