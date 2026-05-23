import { createFileRoute } from '@tanstack/react-router'
import SellerLoginPage from '@/src/pages/seller-login'

export const Route = createFileRoute('/_public/seller/login')({
  component: SellerLoginPage,
})
