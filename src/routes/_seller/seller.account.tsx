import { createFileRoute } from '@tanstack/react-router'
import SellerAccountPage from '@/src/pages/seller-account'

export const Route = createFileRoute('/_seller/seller/account')({
  component: SellerAccountPage,
})
