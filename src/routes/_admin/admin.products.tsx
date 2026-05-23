import { createFileRoute } from '@tanstack/react-router'
import AdminProductsPage from '@/src/pages/admin-products'

export const Route = createFileRoute('/_admin/admin/products')({
  component: AdminProductsPage,
})
