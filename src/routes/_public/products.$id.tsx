import { createFileRoute } from '@tanstack/react-router'
import ProductDetailPage from '@/src/pages/product-detail'

export const Route = createFileRoute('/_public/products/$id')({
  component: ProductDetailPage,
})
