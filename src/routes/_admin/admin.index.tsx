import { createFileRoute } from '@tanstack/react-router'
import AdminDashboard from '@/src/pages/admin-dashboard'

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminDashboard,
})
