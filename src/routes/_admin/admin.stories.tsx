import { createFileRoute } from '@tanstack/react-router'
import AdminStoriesPage from '@/pages/admin-stories'

export const Route = createFileRoute('/_admin/admin/stories')({
  component: AdminStoriesPage,
})
