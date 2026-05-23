import { createFileRoute } from '@tanstack/react-router'
import AddProductPage from '@/src/pages/seller-add'

export const Route = createFileRoute('/_seller/seller/add')({
  component: AddProductPage,
})
