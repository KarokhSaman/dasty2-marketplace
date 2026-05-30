import { createFileRoute } from '@tanstack/react-router'
import AdminSellersPage from '@/pages/admin-sellers'

export const Route = createFileRoute('/_admin/admin/sellers')({
  component: AdminSellersPage,
})
