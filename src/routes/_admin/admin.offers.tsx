import { createFileRoute } from '@tanstack/react-router'
import AdminOffersPage from '@/src/pages/admin-offers'

export const Route = createFileRoute('/_admin/admin/offers')({
  component: AdminOffersPage,
})
