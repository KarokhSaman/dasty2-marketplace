import { createFileRoute } from '@tanstack/react-router'
import SellerAccountPage from '@/pages/seller-account'

export const Route = createFileRoute('/_seller/seller/account')({
  component: SellerAccountPage,
})
