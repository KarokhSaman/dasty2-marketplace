import { createFileRoute } from '@tanstack/react-router'
import AddProductPage from '@/pages/seller-add'

export const Route = createFileRoute('/_public/_seller/seller/add')({
  component: AddProductPage,
})
