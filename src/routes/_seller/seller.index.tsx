import { createFileRoute } from '@tanstack/react-router'
import SellerDashboard from '@/src/pages/seller-dashboard'

export const Route = createFileRoute('/_seller/seller/')({
  component: SellerDashboard,
})
