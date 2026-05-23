import { createFileRoute, Outlet } from '@tanstack/react-router'
import SellerShell from '@/components/seller/SellerShell'
import { requireSellerFn } from '@/src/server/auth-guards'

export const Route = createFileRoute('/_seller')({
  beforeLoad: async () => {
    const { sellerId } = await requireSellerFn()
    return { sellerId }
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
