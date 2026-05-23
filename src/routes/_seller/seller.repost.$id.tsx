import { createFileRoute } from '@tanstack/react-router'
import RepostPage from '@/src/pages/seller-repost'

export const Route = createFileRoute('/_seller/seller/repost/$id')({
  component: RepostPage,
})
