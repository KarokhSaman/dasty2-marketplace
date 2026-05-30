import { createFileRoute } from '@tanstack/react-router'
import AdminAdminsPage from '@/pages/admin-admins'

export const Route = createFileRoute('/_admin/admin/admins')({
  component: AdminAdminsPage,
})
