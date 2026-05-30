import { createFileRoute } from '@tanstack/react-router'
import EditProductPage from '@/pages/seller-edit'

export const Route = createFileRoute('/_seller/seller/products/$id/edit')({
  component: EditProductPage,
})
