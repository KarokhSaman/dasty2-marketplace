import { createFileRoute } from '@tanstack/react-router'
import SellerDashboard from '@/pages/seller-dashboard'

export const Route = createFileRoute('/_seller/seller/')({
  component: SellerDashboard,
})
