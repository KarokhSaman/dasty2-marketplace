import { createFileRoute } from '@tanstack/react-router'
import AdminFeesPage from '@/pages/admin-fees'

export const Route = createFileRoute('/_admin/admin/fees')({
  component: AdminFeesPage,
})
