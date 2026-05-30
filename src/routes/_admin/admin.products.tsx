import { createFileRoute } from '@tanstack/react-router'
import AdminProductsPage from '@/pages/admin-products'

export const Route = createFileRoute('/_admin/admin/products')({
  component: AdminProductsPage,
})
